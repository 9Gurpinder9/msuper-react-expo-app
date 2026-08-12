# SaaS Accounting, Invoicing, Stock & Finance Management Architecture (`antigravity_accounting_plan.md`)

This document defines the production-ready technical design, PostgreSQL schemas, transaction validation engines, scaling blueprints, and implementation steps for integrating a unified **Financial Accounting, Invoicing, Inventory Ledger, and Finance Operations** system into our multi-tenant company dashboard (`/company/accounting/`).

It harmonizes modern GAAP/IFRS double-entry accounting with proven real-world ERP features from legacy systems (including pending/posted voucher lifecycles, cash entries, installment schedules, overdue collection tracking, follow-up notes, day book, and trial balance reports).

---

## Architectural Decision Records (ADRs)

### 📄 ADR-001: Unified Accounting & Finance Domain
* **Status**: ACCEPTED
* **Context**: We require a comprehensive accounting, inventory, billing, and finance operations engine inside the multi-tenant company workspace.
* **Decisions**:
  1. **Unified Routing**: Group all accounting & financial modules under the single unified path: `/company/accounting/` (`/company/accounting/dashboard`, `/company/accounting/accounts`, `/company/accounting/items`, `/company/accounting/invoices`, `/company/accounting/cash-entries`, `/company/accounting/journal-entries`, `/company/accounting/overdue`, `/company/accounting/reports`, `/company/accounting/settings`).
  2. **Supabase Defaults & RLS**: Primary keys use `gen_random_uuid()` generated directly in Supabase. Multi-tenant isolation is enforced using `company_id` and `CURRENT_SETTING('app.current_company_id')`.
  3. **Single Currency**: Initial MVP operates in **INR (₹)** with GST tax component breakdown (CGST, SGST, IGST).

### 📄 ADR-002: Configurable Negative Inventory Policy
* **Status**: ACCEPTED
* **Context**: Different businesses have different inventory policies (e.g. retail vs pre-order service items).
* **Decisions**:
  1. **Company Settings Toggle**: Add `allow_negative_stock` (`BOOLEAN DEFAULT TRUE`) in `company_settings`.
  2. **Default Behavior**: Negative inventory is **ALLOWED by default**.
  3. **Validation Engine**: When `allow_negative_stock = FALSE`, saving/posting an invoice verifies that all line-item quantities do not exceed available stock (`current_stock >= quantity`). If an item's stock is 0 or insufficient, invoice creation fails instantly with a clear validation error.

### 📄 ADR-003: Two-Phase Voucher Lifecycle (Draft/Pending → Posted Ledger)
* **Status**: ACCEPTED
* **Context**: Financial entries (invoices, cash receipts, journal vouchers) often require draft/review states before committing to the permanent general ledger.
* **Decisions**:
  1. **Draft/Pending State**: Entries start with `is_posted = FALSE` (or `status = 'DRAFT'`).
  2. **Permanent Ledger Commitment**: Once posted (`is_posted = TRUE`), automated triggers insert immutable debit/credit lines into `ledger_lines`, update `account_balances` rollups in $O(1)$ complexity, and lock the source document against direct editing.

---

## Cognitive System Design Formula

$$\text{Architecture Assessment} = \text{[Current MVP Need]} + \text{[10x-100x Scaling Strategy]} + \text{[Security / Threat Model]} + \text{[Operations / Lifecycle Cost]}$$

* **Current MVP Need**: An atomic double-entry general ledger, unified multi-tier catalog with custom GST tax components, configurable negative inventory rules, cash entry management, installment payment splits, overdue tracking with follow-up remarks, day book, and trial balance reporting.
* **10x-100x Scaling Strategy**: Full database table partitioning by `company_id`. Write-side incremental ledger rollups (`account_balances`) for $O(1)$ read performance.
* **Security / Threat Model**: Multi-tenant isolation enforced via composite key indexes (`company_id` first) paired with Row-Level Security (RLS) policies. Immutable ledger states enforced via database triggers to prevent raw editing or deletion of posted journal lines.
* **Operations / Lifecycle Cost**: Decoupled business vertical modules using the Pluggable Core Pattern. Keeps core financial structures lean while allowing vertical features to be added dynamically.

---

## I. Core Database Schema Foundation (PostgreSQL / Supabase)

### 1. Chart of Accounts (COA) & General Ledger

```sql
-- Account Category Classifications
CREATE TYPE account_type AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE');

-- Company Settings (Accounting & Finance Config)
CREATE TABLE company_settings (
    company_id UUID PRIMARY KEY,
    allow_negative_stock BOOLEAN NOT NULL DEFAULT TRUE,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Chart of Accounts Master
CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    created_by UUID NOT NULL,
    updated_by UUID,
    account_code VARCHAR(50) NOT NULL, -- e.g. "1010" (Cash), "1200" (A/R), "4000" (Revenue)
    name VARCHAR(150) NOT NULL,
    type account_type NOT NULL,
    parent_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
    opening_balance NUMERIC(15, 4) NOT NULL DEFAULT 0.0000,
    is_system BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_company_account_code UNIQUE (company_id, account_code)
);

-- Master Journal Entries Header
CREATE TABLE journal_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    created_by UUID NOT NULL,
    updated_by UUID,
    entry_type VARCHAR(20) NOT NULL DEFAULT 'GENERAL', -- 'GENERAL', 'CASH', 'INVOICE'
    posting_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reference_number VARCHAR(100),
    description TEXT,
    is_posted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Double-Entry Ledger Lines
CREATE TABLE ledger_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    created_by UUID NOT NULL,
    journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    debit NUMERIC(15, 4) NOT NULL DEFAULT 0.0000 CHECK (debit >= 0),
    credit NUMERIC(15, 4) NOT NULL DEFAULT 0.0000 CHECK (credit >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_debit_credit_exclusivity CHECK (
        (debit > 0 AND credit = 0) OR (debit = 0 AND credit > 0)
    )
);

-- Index Design optimized for fast tenant checks
CREATE INDEX idx_accounts_tenant_lookup ON accounts (company_id, account_code);
CREATE INDEX idx_ledger_lines_tenant_lookup ON ledger_lines (company_id, account_id, created_at DESC);
```

### 2. Real-Time Write-Side Incremental Rollups

```sql
CREATE TABLE account_balances (
    company_id UUID NOT NULL,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    total_debit NUMERIC(15, 4) NOT NULL DEFAULT 0.0000,
    total_credit NUMERIC(15, 4) NOT NULL DEFAULT 0.0000,
    current_balance NUMERIC(15, 4) NOT NULL DEFAULT 0.0000,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (company_id, account_id)
);

CREATE OR REPLACE FUNCTION update_incremental_account_balance()
RETURNS TRIGGER AS $$
DECLARE
    v_delta_debit NUMERIC(15, 4) := 0.0000;
    v_delta_credit NUMERIC(15, 4) := 0.0000;
    v_delta_balance NUMERIC(15, 4) := 0.0000;
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_delta_debit := NEW.debit;
        v_delta_credit := NEW.credit;
    ELSIF TG_OP = 'DELETE' THEN
        v_delta_debit := -OLD.debit;
        v_delta_credit := -OLD.credit;
    END IF;

    v_delta_balance := v_delta_debit - v_delta_credit;

    INSERT INTO account_balances (company_id, account_id, total_debit, total_credit, current_balance, updated_at)
    VALUES (NEW.company_id, NEW.account_id, v_delta_debit, v_delta_credit, v_delta_balance, CURRENT_TIMESTAMP)
    ON CONFLICT (company_id, account_id) DO UPDATE SET
        total_debit = account_balances.total_debit + EXCLUDED.total_debit,
        total_credit = account_balances.total_credit + EXCLUDED.total_credit,
        current_balance = account_balances.current_balance + EXCLUDED.current_balance,
        updated_at = CURRENT_TIMESTAMP;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ledger_lines_balance_rollup
AFTER INSERT OR DELETE ON ledger_lines
FOR EACH ROW EXECUTE FUNCTION update_incremental_account_balance();
```

---

## II. Product, Tax & Inventory Engine

```sql
-- Tax Classes & Split Components (CGST, SGST, IGST)
CREATE TABLE tax_classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    created_by UUID NOT NULL,
    updated_by UUID,
    name VARCHAR(100) NOT NULL,
    rate NUMERIC(6, 4) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_company_tax_class UNIQUE (company_id, name)
);

CREATE TABLE tax_components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    created_by UUID NOT NULL,
    tax_class_id UUID NOT NULL REFERENCES tax_classes(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    rate NUMERIC(6, 4) NOT NULL
);

-- Core Products Master Registry
CREATE TABLE items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    created_by UUID NOT NULL,
    updated_by UUID,
    sku VARCHAR(100) NOT NULL,
    barcode VARCHAR(100),
    name VARCHAR(150) NOT NULL,
    sale_price NUMERIC(15, 4) NOT NULL DEFAULT 0.0000,
    cost_price NUMERIC(15, 4) NOT NULL DEFAULT 0.0000,
    current_stock NUMERIC(12, 4) NOT NULL DEFAULT 0.0000,
    tax_class_id UUID NOT NULL REFERENCES tax_classes(id) ON DELETE RESTRICT,
    track_inventory BOOLEAN DEFAULT FALSE,
    inventory_account_id UUID REFERENCES accounts(id) ON DELETE RESTRICT,
    income_account_id UUID REFERENCES accounts(id) ON DELETE RESTRICT,
    expense_account_id UUID REFERENCES accounts(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_company_sku UNIQUE (company_id, sku)
);
```

---

## III. Invoicing, Stock & Finance Operations Ledger

```sql
CREATE TYPE contact_type AS ENUM ('CUSTOMER', 'SUPPLIER', 'BOTH');
CREATE TYPE invoice_status AS ENUM ('DRAFT', 'SENT', 'PAID', 'PARTIALLY_PAID', 'VOID');
CREATE TYPE stock_transaction_type AS ENUM ('PURCHASE', 'SALE', 'ADJUSTMENT', 'RETURN');

-- Master Contacts
CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    created_by UUID NOT NULL,
    updated_by UUID,
    type contact_type NOT NULL DEFAULT 'CUSTOMER',
    name VARCHAR(200) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    tax_number VARCHAR(100),
    outstanding_balance NUMERIC(15, 4) NOT NULL DEFAULT 0.0000,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Invoices Header
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    created_by UUID NOT NULL,
    updated_by UUID,
    invoice_number VARCHAR(100) NOT NULL,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE RESTRICT,
    issue_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    due_date TIMESTAMPTZ NOT NULL,
    subtotal NUMERIC(15, 4) NOT NULL DEFAULT 0.0000,
    tax_total NUMERIC(15, 4) NOT NULL DEFAULT 0.0000,
    discount_total NUMERIC(15, 4) NOT NULL DEFAULT 0.0000,
    grand_total NUMERIC(15, 4) NOT NULL DEFAULT 0.0000,
    paid_total NUMERIC(15, 4) NOT NULL DEFAULT 0.0000,
    status invoice_status NOT NULL DEFAULT 'DRAFT',
    is_posted BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_company_invoice_number UNIQUE (company_id, invoice_number)
);

-- Invoice Line Items
CREATE TABLE invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    created_by UUID NOT NULL,
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
    quantity NUMERIC(12, 4) NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(15, 4) NOT NULL,
    discount_percentage NUMERIC(5, 4) NOT NULL DEFAULT 0.0000,
    tax_amount NUMERIC(15, 4) NOT NULL DEFAULT 0.0000,
    row_total NUMERIC(15, 4) NOT NULL DEFAULT 0.0000,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Stock Ledger
CREATE TABLE stock_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    created_by UUID NOT NULL,
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
    transaction_type stock_transaction_type NOT NULL,
    quantity NUMERIC(12, 4) NOT NULL,
    unit_cost NUMERIC(15, 4) NOT NULL,
    reference_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- -------------------------------------------------------------
-- FINANCE MANAGEMENT EXTENSION TABLES (Adapted from muktierp)
-- -------------------------------------------------------------

-- 1. Installment Schedules (Multi-payment tracking)
CREATE TABLE finance_installments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    created_by UUID NOT NULL,
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    installment_number INT NOT NULL,
    due_date TIMESTAMPTZ NOT NULL,
    amount NUMERIC(15, 4) NOT NULL CHECK (amount > 0),
    paid_amount NUMERIC(15, 4) NOT NULL DEFAULT 0.0000,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'PARTIAL', 'PAID', 'OVERDUE'
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_invoice_installment UNIQUE (invoice_id, installment_number)
);

-- 2. Follow-Up System (Receivables & Collection Notes)
CREATE TABLE finance_follow_ups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    created_by UUID NOT NULL,
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    remark TEXT NOT NULL,
    follow_up_date TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN', -- 'OPEN', 'COMPLETED', 'CANCELLED'
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexing for Overdue and Follow-Up Performance
CREATE INDEX idx_installments_overdue ON finance_installments (company_id, status, due_date);
CREATE INDEX idx_follow_ups_tenant ON finance_follow_ups (company_id, follow_up_date);
```

---

## IV. RLS & Immutability Enforcement

```sql
-- RLS Activation
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_follow_ups ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_accounts ON accounts
    FOR ALL USING (company_id = CURRENT_SETTING('app.current_company_id')::UUID);

CREATE POLICY tenant_isolation_invoices ON invoices
    FOR ALL USING (company_id = CURRENT_SETTING('app.current_company_id')::UUID);

CREATE POLICY tenant_isolation_installments ON finance_installments
    FOR ALL USING (company_id = CURRENT_SETTING('app.current_company_id')::UUID);

CREATE POLICY tenant_isolation_follow_ups ON finance_follow_ups
    FOR ALL USING (company_id = CURRENT_SETTING('app.current_company_id')::UUID);

-- Immutable Ledger Trigger
CREATE OR REPLACE FUNCTION enforce_posted_ledger_immutability()
RETURNS TRIGGER AS $$
BEGIN
    IF (SELECT is_posted FROM journal_entries WHERE id = OLD.journal_entry_id) THEN
        RAISE EXCEPTION 'Immutable Ledger Exception: Cannot update or delete lines belonging to a posted journal entry.';
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ledger_lines_immutability
BEFORE UPDATE OR DELETE ON ledger_lines
FOR EACH ROW EXECUTE FUNCTION enforce_posted_ledger_immutability();
```

---

## V. Application Implementation Architecture

### Backend (`backend/src/company/accounting/`)
* **`schemas.ts`**: Joi validation for COA, Items, Invoice Creation, Cash Entries, Installments, Follow-Ups, and Settings.
* **`accounting.service.ts`**: Database transaction handling, negative stock validation, dynamic ledger posting, overdue calculation workers, and follow-up logging.
* **`accounting.controller.ts`**: Express request handlers for all accounting & finance endpoints.
* **`routes.ts`**: Mounted at `/company/accounting` in `src/routes/index.ts`.

### Frontend (`frontend/app/(app)/company/accounting/`)
* **`_layout.tsx`**: Top navigation header & layout guard.
* **`index.tsx`**: Unified Accounting & Finance Dashboard overview.
* **`accounts.tsx`**: Chart of Accounts & Groups registry.
* **`items/index.tsx`**: Items master & stock view.
* **`invoices/index.tsx`**: Invoices list & status badges.
* **`invoices/create.tsx`**: Interactive checkout selector UI with real-time tax calculation and negative stock warning checks.
* **`cash-entries/index.tsx`**: Cash receipt/payment entries (from legacy `cash_entry_list.php`).
* **`cash-entries/create.tsx`**: Rapid cash receipt/payment entry form (from legacy `cash_entry_new.php`).
* **`journal-entries/index.tsx`**: Double-entry journal voucher listing (from legacy `journal_entry_list.php`).
* **`overdue/index.tsx`**: Overdue tracking & collection dashboard (from legacy `finance_entry_list_overdue.php`).
* **`overdue/monthwise.tsx`**: Month-wise overdue aggregation report (from legacy `finance_entry_list_overdue_monthwise.php`).
* **`reports/day-book.tsx`**: Daily transactions log report (from legacy `day_book.php`).
* **`reports/trial-balance.tsx`**: Self-balancing Trial Balance report (from legacy `account_trial_balance_list.php`).
* **`settings.tsx`**: Accounting configuration screen (`allow_negative_stock` toggle).

---

## VI. Verification & Testing Plan

1. **Typecheck & Diagnostics**:
   - `npx tsc --noEmit --skipLibCheck --project backend/tsconfig.json`
   - `npx tsc --noEmit --skipLibCheck --project frontend/tsconfig.json`
   - `npx expo-doctor`
2. **Web E2E Verification**: Playwright test script (`e2e/accounting_web_test.py`) targeting `http://localhost:8081/company/accounting/invoices/create`.
3. **Negative Stock Policy Testing**:
   - Validate billing with 0 stock when `allow_negative_stock = true`.
   - Validate error block when `allow_negative_stock = false`.
4. **Finance Operations Testing**:
   - Verify cash entry creation posts balanced debit/credit lines to Cash (`1010`).
   - Verify installment scheduling splits invoice due dates correctly.
   - Verify follow-up remarks log correctly against overdue items.
