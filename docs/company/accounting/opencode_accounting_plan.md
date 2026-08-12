# SaaS Accounting, Invoicing, & Stock Management - Implementation Plan

## Overview

This document defines the production-ready technical design, PostgreSQL schemas, transaction validation engines, and scaling blueprints for integrating an enterprise-grade, GAAP/IFRS-compliant financial accounting and inventory ledger into our multi-tenant company dashboard.

---

## Cognitive Formula for System Design

```
Architecture Assessment = [Current MVP Need] + [10x-100x Scaling Strategy] + [Security / Threat Model] + [Operations / Lifecycle Cost]
```

- **Current MVP Need:** Atomic, immutable double-entry general ledger, unified multi-tier catalog with custom GST tax components, and an invoice checkout engine with real-time tracking.
- **10x-100x Scaling Strategy:** Database table partitioning by company_id. Sequential UUIDv7 values to prevent B-Tree fragmentation. Trigger-based, write-side incremental ledger rollups.
- **Security / Threat Model:** Multi-tenant isolation via composite key indexes + RLS policies. Immutable ledger states via database triggers. Append-only audit log system.
- **Operations / Lifecycle Cost:** Pluggable Core Pattern for decoupled business vertical modules.

---

## Decisions Confirmed

| Decision          | Choice                                  |
| ----------------- | --------------------------------------- |
| Invoice Numbering | Auto-generated (`INV-2026-0001` format) |
| Currency          | INR only                                |
| Payment Tracking  | Yes, implement now                      |
| GST Filing        | Summary reports only                    |
| Barcode Scanning  | No                                      |
| Offline Support   | No                                      |

---

## Phase 1: Database Schema & Migrations

### Migration Files

```
backend/src/database/migrations/
  001_create_accounting_enums.sql
  002_create_accounts_table.sql
  003_create_journal_entries_table.sql
  004_create_ledger_lines_table.sql
  005_create_account_balances_table.sql
  006_create_balance_rollup_trigger.sql
  007_create_tax_classes_table.sql
  008_create_tax_components_table.sql
  009_create_items_table.sql
  010_create_contacts_table.sql
  011_create_invoices_table.sql
  012_create_invoice_items_table.sql
  013_create_invoice_sequences_table.sql
  014_create_payments_table.sql
  015_create_payment_lines_table.sql
  016_create_stock_ledger_table.sql
  017_create_audit_logs_table.sql
  018_create_rls_policies.sql
  019_create_post_invoice_trigger.sql
  020_create_post_payment_trigger.sql
  021_create_immutability_trigger.sql
```

### Core Enums

```sql
CREATE TYPE account_type AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE');
CREATE TYPE invoice_status AS ENUM ('DRAFT', 'SENT', 'PAID', 'PARTIALLY_PAID', 'VOID');
CREATE TYPE stock_transaction_type AS ENUM ('PURCHASE', 'SALE', 'ADJUSTMENT', 'RETURN');
CREATE TYPE contact_type AS ENUM ('CUSTOMER', 'SUPPLIER', 'BOTH');
CREATE TYPE payment_mode AS ENUM ('CASH', 'BANK_TRANSFER', 'UPI', 'CHEQUE', 'CARD', 'OTHER');
```

### 1. Chart of Accounts

```sql
CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    created_by UUID NOT NULL,
    updated_by UUID,
    account_code VARCHAR(50) NOT NULL,
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

CREATE INDEX idx_accounts_tenant_lookup ON accounts (company_id, account_code);
```

### 2. Journal Entries

```sql
CREATE TABLE journal_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    created_by UUID NOT NULL,
    updated_by UUID,
    posting_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reference_number VARCHAR(100),
    description TEXT,
    is_posted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_journal_entries_tenant ON journal_entries (company_id, posting_date DESC);
```

### 3. Ledger Lines

```sql
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

CREATE INDEX idx_ledger_lines_tenant_lookup ON ledger_lines (company_id, account_id, created_at DESC);
CREATE INDEX idx_ledger_lines_journal ON ledger_lines (journal_entry_id);
```

### 4. Account Balances (Write-Side Rollups)

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
```

### 5. Balance Rollup Trigger

```sql
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

### 6. Tax Classes & Components

```sql
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
```

### 7. Items Master

```sql
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
    tax_class_id UUID NOT NULL REFERENCES tax_classes(id) ON DELETE RESTRICT,
    track_inventory BOOLEAN DEFAULT FALSE,
    inventory_account_id UUID REFERENCES accounts(id) ON DELETE RESTRICT,
    income_account_id UUID REFERENCES accounts(id) ON DELETE RESTRICT,
    expense_account_id UUID REFERENCES accounts(id) ON DELETE RESTRICT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_company_sku UNIQUE (company_id, sku)
);

CREATE INDEX idx_items_tenant ON items (company_id, sku);
```

### 8. Contacts

```sql
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
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_contacts_tenant ON contacts (company_id, type);
```

### 9. Invoices

```sql
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
    amount_paid NUMERIC(15, 4) NOT NULL DEFAULT 0.0000,
    status invoice_status NOT NULL DEFAULT 'DRAFT',
    is_posted BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_company_invoice_number UNIQUE (company_id, invoice_number)
);

CREATE INDEX idx_invoices_tenant ON invoices (company_id, status, issue_date DESC);
```

### 10. Invoice Items

```sql
CREATE TABLE invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    created_by UUID NOT NULL,
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
    quantity NUMERIC(12, 4) NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(15, 4) NOT NULL,
    discount_percentage NUMERIC(5, 4) NOT NULL DEFAULT 0.0000,
    tax_class_id UUID NOT NULL REFERENCES tax_classes(id) ON DELETE RESTRICT,
    tax_amount NUMERIC(15, 4) NOT NULL DEFAULT 0.0000,
    row_total NUMERIC(15, 4) NOT NULL DEFAULT 0.0000,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_invoice_items_tenant ON invoice_items (invoice_id);
```

### 11. Invoice Sequences (Auto-Numbering)

```sql
CREATE TABLE invoice_sequences (
    company_id UUID NOT NULL,
    fiscal_year VARCHAR(10) NOT NULL,
    last_number INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (company_id, fiscal_year)
);
```

### 12. Payments

```sql
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    created_by UUID NOT NULL,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE RESTRICT,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    payment_number VARCHAR(100) NOT NULL,
    payment_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    amount NUMERIC(15, 4) NOT NULL CHECK (amount > 0),
    payment_mode payment_mode NOT NULL,
    reference_number VARCHAR(100),
    notes TEXT,
    is_posted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_company_payment_number UNIQUE (company_id, payment_number)
);

CREATE INDEX idx_payments_tenant ON payments (company_id, contact_id, payment_date DESC);
```

### 13. Payment Lines

```sql
CREATE TABLE payment_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
    amount_applied NUMERIC(15, 4) NOT NULL CHECK (amount_applied > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payment_lines_tenant ON payment_lines (payment_id);
```

### 14. Stock Ledger

```sql
CREATE TABLE stock_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    created_by UUID NOT NULL,
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
    transaction_type stock_transaction_type NOT NULL,
    quantity NUMERIC(12, 4) NOT NULL,
    unit_cost NUMERIC(15, 4) NOT NULL,
    reference_id UUID NOT NULL,
    reference_type VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_stock_ledger_tenant ON stock_ledger (company_id, item_id, created_at DESC);
```

### 15. Audit Logs

```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    user_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    before_state JSONB,
    after_state JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_lookup ON audit_logs (company_id, table_name, record_id);
```

### 16. RLS Policies

```sql
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_accounts ON accounts FOR ALL USING (company_id = CURRENT_SETTING('app.current_company_id')::UUID);
CREATE POLICY tenant_isolation_journal_entries ON journal_entries FOR ALL USING (company_id = CURRENT_SETTING('app.current_company_id')::UUID);
CREATE POLICY tenant_isolation_ledger_lines ON ledger_lines FOR ALL USING (company_id = CURRENT_SETTING('app.current_company_id')::UUID);
CREATE POLICY tenant_isolation_account_balances ON account_balances FOR ALL USING (company_id = CURRENT_SETTING('app.current_company_id')::UUID);
CREATE POLICY tenant_isolation_tax_classes ON tax_classes FOR ALL USING (company_id = CURRENT_SETTING('app.current_company_id')::UUID);
CREATE POLICY tenant_isolation_tax_components ON tax_components FOR ALL USING (company_id = CURRENT_SETTING('app.current_company_id')::UUID);
CREATE POLICY tenant_isolation_items ON items FOR ALL USING (company_id = CURRENT_SETTING('app.current_company_id')::UUID);
CREATE POLICY tenant_isolation_contacts ON contacts FOR ALL USING (company_id = CURRENT_SETTING('app.current_company_id')::UUID);
CREATE POLICY tenant_isolation_invoices ON invoices FOR ALL USING (company_id = CURRENT_SETTING('app.current_company_id')::UUID);
CREATE POLICY tenant_isolation_invoice_items ON invoice_items FOR ALL USING (company_id = CURRENT_SETTING('app.current_company_id')::UUID);
CREATE POLICY tenant_isolation_payments ON payments FOR ALL USING (company_id = CURRENT_SETTING('app.current_company_id')::UUID);
CREATE POLICY tenant_isolation_payment_lines ON payment_lines FOR ALL USING (company_id = CURRENT_SETTING('app.current_company_id')::UUID);
CREATE POLICY tenant_isolation_stock_ledger ON stock_ledger FOR ALL USING (company_id = CURRENT_SETTING('app.current_company_id')::UUID);
CREATE POLICY tenant_isolation_audit_logs ON audit_logs FOR ALL USING (company_id = CURRENT_SETTING('app.current_company_id')::UUID);
```

### 17. Invoice Posting Trigger

```sql
CREATE OR REPLACE FUNCTION post_invoice_to_ledger(p_invoice_id UUID)
RETURNS VOID AS $$
DECLARE
    v_invoice RECORD;
    v_line RECORD;
    v_entry_id UUID;
    v_ar_account_id UUID;
    v_company_id UUID;
    v_creator_id UUID;
BEGIN
    SELECT id, company_id, created_by, grand_total, invoice_number
    INTO v_invoice
    FROM invoices
    WHERE id = p_invoice_id AND is_posted = FALSE
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invoice not found or already posted.';
    END IF;

    SELECT id INTO v_ar_account_id
    FROM accounts
    WHERE company_id = v_invoice.company_id AND account_code = '1200' AND is_system = TRUE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Accounts Receivable account (1200) not found for company.';
    END IF;

    INSERT INTO journal_entries (company_id, created_by, posting_date, reference_number, description, is_posted)
    VALUES (v_invoice.company_id, v_invoice.created_by, CURRENT_TIMESTAMP, v_invoice.invoice_number, 'Invoice #' || v_invoice.invoice_number, TRUE)
    RETURNING id INTO v_entry_id;

    INSERT INTO ledger_lines (company_id, created_by, journal_entry_id, account_id, debit, credit)
    VALUES (v_invoice.company_id, v_invoice.created_by, v_entry_id, v_ar_account_id, v_invoice.grand_total, 0.0000);

    FOR v_line IN
        SELECT ii.row_total, ii.tax_amount, i.income_account_id, tc.name AS tax_name
        FROM invoice_items ii
        JOIN items i ON ii.item_id = i.id
        JOIN tax_classes tc ON ii.tax_class_id = tc.id
        WHERE ii.invoice_id = p_invoice_id
    LOOP
        INSERT INTO ledger_lines (company_id, created_by, journal_entry_id, account_id, debit, credit)
        VALUES (v_invoice.company_id, v_invoice.created_by, v_entry_id, v_line.income_account_id, 0.0000, (v_line.row_total - v_line.tax_amount));

        IF v_line.tax_amount > 0 THEN
            INSERT INTO ledger_lines (company_id, created_by, journal_entry_id, account_id, debit, credit)
            SELECT v_invoice.company_id, v_invoice.created_by, v_entry_id, a.id, 0.0000, v_line.tax_amount
            FROM accounts a
            WHERE a.company_id = v_invoice.company_id AND a.account_code = '2200' AND a.is_system = TRUE;
        END IF;
    END LOOP;

    UPDATE invoices SET is_posted = TRUE, status = 'SENT' WHERE id = p_invoice_id;
END;
$$ LANGUAGE plpgsql;
```

### 18. Payment Posting Trigger

```sql
CREATE OR REPLACE FUNCTION post_payment_to_ledger(p_payment_id UUID)
RETURNS VOID AS $$
DECLARE
    v_payment RECORD;
    v_line RECORD;
    v_entry_id UUID;
    v_bank_account_id UUID;
BEGIN
    SELECT id, company_id, created_by, amount, contact_id, payment_number
    INTO v_payment
    FROM payments
    WHERE id = p_payment_id AND is_posted = FALSE
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payment not found or already posted.';
    END IF;

    SELECT id INTO v_bank_account_id
    FROM accounts
    WHERE company_id = v_payment.company_id AND account_code = '1100' AND is_system = TRUE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Bank account (1100) not found for company.';
    END IF;

    INSERT INTO journal_entries (company_id, created_by, posting_date, reference_number, description, is_posted)
    VALUES (v_payment.company_id, v_payment.created_by, CURRENT_TIMESTAMP, v_payment.payment_number, 'Payment #' || v_payment.payment_number, TRUE)
    RETURNING id INTO v_entry_id;

    INSERT INTO ledger_lines (company_id, created_by, journal_entry_id, account_id, debit, credit)
    VALUES (v_payment.company_id, v_payment.created_by, v_entry_id, v_bank_account_id, v_payment.amount, 0.0000);

    INSERT INTO ledger_lines (company_id, created_by, journal_entry_id, account_id, debit, credit)
    SELECT v_payment.company_id, v_payment.created_by, v_entry_id, a.id, 0.0000, v_payment.amount
    FROM accounts a
    WHERE a.company_id = v_payment.company_id AND a.account_code = '1200' AND a.is_system = TRUE;

    UPDATE payments SET is_posted = TRUE WHERE id = p_payment_id;
END;
$$ LANGUAGE plpgsql;
```

### 19. Ledger Immutability Trigger

```sql
CREATE OR REPLACE FUNCTION enforce_posted_ledger_immutability()
RETURNS TRIGGER AS $$
BEGIN
    IF (SELECT is_posted FROM journal_entries WHERE id = OLD.journal_entry_id) THEN
        RAISE EXCEPTION 'Cannot modify lines belonging to a posted journal entry.';
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ledger_lines_immutability
BEFORE UPDATE OR DELETE ON ledger_lines
FOR EACH ROW EXECUTE FUNCTION enforce_posted_ledger_immutability();
```

---

## Phase 2: Backend Module Structure

### Directory Structure

```
backend/src/company/accounting/
  schemas.ts
  routes.ts
  controllers/
    accounts.controller.ts
    journal.controller.ts
    ledger.controller.ts
    tax.controller.ts
    items.controller.ts
    contacts.controller.ts
    invoices.controller.ts
    payments.controller.ts
    stock.controller.ts
    reports.controller.ts
  services/
    accounts.service.ts
    journal.service.ts
    ledger.service.ts
    tax.service.ts
    items.service.ts
    contacts.service.ts
    invoices.service.ts
    payments.service.ts
    stock.service.ts
    reports.service.ts
    uuid.service.ts
  utils/
    invoice-number.ts
    ledger-posting.ts
    balance-calculator.ts
```

### Key API Endpoints

#### Chart of Accounts

| Method | Path                                      | Description    |
| ------ | ----------------------------------------- | -------------- |
| GET    | `/company/accounting/accounts`            | List accounts  |
| POST   | `/company/accounting/accounts`            | Create account |
| GET    | `/company/accounting/accounts/:id`        | Get account    |
| PUT    | `/company/accounting/accounts/:id`        | Update account |
| PATCH  | `/company/accounting/accounts/:id/toggle` | Toggle active  |

#### Journal Entries

| Method | Path                                           | Description    |
| ------ | ---------------------------------------------- | -------------- |
| GET    | `/company/accounting/journal-entries`          | List entries   |
| POST   | `/company/accounting/journal-entries`          | Create entry   |
| GET    | `/company/accounting/journal-entries/:id`      | Get entry      |
| PUT    | `/company/accounting/journal-entries/:id`      | Update entry   |
| POST   | `/company/accounting/journal-entries/:id/post` | Post to ledger |
| POST   | `/company/accounting/journal-entries/:id/void` | Void entry     |

#### Ledger Lines

| Method | Path                                           | Description       |
| ------ | ---------------------------------------------- | ----------------- |
| GET    | `/company/accounting/ledger-lines`             | Query lines       |
| GET    | `/company/accounting/ledger-lines/account/:id` | Lines for account |

#### Tax Configuration

| Method | Path                                             | Description      |
| ------ | ------------------------------------------------ | ---------------- |
| GET    | `/company/accounting/tax-classes`                | List tax classes |
| POST   | `/company/accounting/tax-classes`                | Create tax class |
| PUT    | `/company/accounting/tax-classes/:id`            | Update tax class |
| GET    | `/company/accounting/tax-components/:taxClassId` | List components  |
| POST   | `/company/accounting/tax-components`             | Create component |

#### Items

| Method | Path                                   | Description   |
| ------ | -------------------------------------- | ------------- |
| GET    | `/company/accounting/items`            | List items    |
| POST   | `/company/accounting/items`            | Create item   |
| GET    | `/company/accounting/items/:id`        | Get item      |
| PUT    | `/company/accounting/items/:id`        | Update item   |
| PATCH  | `/company/accounting/items/:id/toggle` | Toggle active |

#### Contacts

| Method | Path                                           | Description     |
| ------ | ---------------------------------------------- | --------------- |
| GET    | `/company/accounting/contacts`                 | List contacts   |
| POST   | `/company/accounting/contacts`                 | Create contact  |
| GET    | `/company/accounting/contacts/:id`             | Get contact     |
| PUT    | `/company/accounting/contacts/:id`             | Update contact  |
| GET    | `/company/accounting/contacts/:id/outstanding` | Get outstanding |

#### Invoices

| Method | Path                                       | Description         |
| ------ | ------------------------------------------ | ------------------- |
| GET    | `/company/accounting/invoices`             | List invoices       |
| POST   | `/company/accounting/invoices`             | Create invoice      |
| GET    | `/company/accounting/invoices/:id`         | Get invoice         |
| PUT    | `/company/accounting/invoices/:id`         | Update invoice      |
| POST   | `/company/accounting/invoices/:id/post`    | Post invoice        |
| POST   | `/company/accounting/invoices/:id/void`    | Void invoice        |
| GET    | `/company/accounting/invoices/next-number` | Preview next number |

#### Payments

| Method | Path                                                  | Description    |
| ------ | ----------------------------------------------------- | -------------- |
| GET    | `/company/accounting/payments`                        | List payments  |
| POST   | `/company/accounting/payments`                        | Record payment |
| GET    | `/company/accounting/payments/:id`                    | Get payment    |
| POST   | `/company/accounting/payments/:id/void`               | Void payment   |
| GET    | `/company/accounting/payments/outstanding/:contactId` | Outstanding    |

#### Stock Ledger

| Method | Path                                             | Description       |
| ------ | ------------------------------------------------ | ----------------- |
| GET    | `/company/accounting/stock`                      | List transactions |
| GET    | `/company/accounting/stock/item/:itemId`         | Item history      |
| GET    | `/company/accounting/stock/item/:itemId/balance` | Current quantity  |

#### Reports

| Method | Path                                        | Description             |
| ------ | ------------------------------------------- | ----------------------- |
| GET    | `/company/accounting/reports/trial-balance` | Trial balance           |
| GET    | `/company/accounting/reports/profit-loss`   | P&L statement           |
| GET    | `/company/accounting/reports/balance-sheet` | Balance sheet           |
| GET    | `/company/accounting/reports/gst-summary`   | GST summary             |
| GET    | `/company/accounting/reports/outstanding`   | Outstanding receivables |

---

## Phase 3: Frontend Module Structure

### Screen Files

```
frontend/app/(app)/company/accounting/
  accounts/
    index.tsx
    add-account.tsx
    edit-account.tsx
  journal/
    index.tsx
    add-journal.tsx
    view-journal.tsx
  invoices/
    index.tsx
    add-invoice.tsx
    view-invoice.tsx
  payments/
    index.tsx
    add-payment.tsx
    view-payment.tsx
  contacts/
    index.tsx
    add-contact.tsx
    edit-contact.tsx
  items/
    index.tsx
    add-item.tsx
    edit-item.tsx
  stock/
    index.tsx
  reports/
    index.tsx
    trial-balance.tsx
    profit-loss.tsx
    balance-sheet.tsx
    gst-summary.tsx
    outstanding.tsx
```

### API Service Files

```
frontend/src/features/accounting/
  types.ts
  accounts.api.ts
  journal.api.ts
  invoices.api.ts
  payments.api.ts
  contacts.api.ts
  items.api.ts
  stock.api.ts
  reports.api.ts
```

---

## Phase 4: Implementation Order

| Step | Module                                       | Complexity | Estimated Effort |
| ---- | -------------------------------------------- | ---------- | ---------------- |
| 1    | Database migrations (core tables + triggers) | HIGH       | 2-3 hours        |
| 2    | UUIDv7 service + invoice number generator    | MEDIUM     | 1 hour           |
| 3    | Accounts CRUD (backend + frontend)           | MEDIUM     | 2-3 hours        |
| 4    | Tax classes/components                       | LOW        | 1 hour           |
| 5    | Items master                                 | MEDIUM     | 2 hours          |
| 6    | Contacts registry                            | LOW        | 1-2 hours        |
| 7    | Journal entries CRUD                         | MEDIUM     | 2-3 hours        |
| 8    | Invoice CRUD (without posting)               | HIGH       | 3-4 hours        |
| 9    | Invoice posting trigger (double-entry)       | HIGH       | 2-3 hours        |
| 10   | Payments + outstanding tracking              | HIGH       | 3-4 hours        |
| 11   | Stock ledger + MAC engine                    | HIGH       | 3-4 hours        |
| 12   | Financial reports                            | MEDIUM     | 3-4 hours        |
| 13   | Audit logs                                   | LOW        | 1 hour           |

**Total Estimated Effort:** 25-35 hours

---

## Transaction Flows

### Invoice Posting Flow

```
Invoice Created (DRAFT)
    |
    v
Invoice Posted (is_posted = TRUE)
    +---> Create Journal Entry (header)
    +---> Debit: Accounts Receivable (1200)
    +---> Credit: Revenue Accounts (item-wise)
    +---> Credit: Tax Liability Accounts (GST)
    +---> Update invoice status to SENT
```

### Payment Recording Flow

```
Payment Received
    +---> Create Payment Record
    +---> Create Payment Lines (applied to invoice)
    +---> Create Journal Entry (header)
    +---> Debit: Bank/Cash Account (1100)
    +---> Credit: Accounts Receivable (1200)
    +---> Update contact.outstanding_balance
    +---> Update invoice status (PAID / PARTIALLY_PAID)
```

### Void Invoice Flow

```
Void Request
    +---> Create Reverse Journal Entry
    +---> Debit: Revenue Accounts (item-wise)
    +---> Debit: Tax Liability Accounts (GST)
    +---> Credit: Accounts Receivable (1200)
    +---> Update invoice status to VOID
    +---> Update stock ledger (if inventory tracked)
```

---

## Risk Assessment

| Risk                                       | Mitigation                                  |
| ------------------------------------------ | ------------------------------------------- |
| Complex double-entry logic                 | Extensive unit testing of posting triggers  |
| Performance with high transaction volume   | Partitioning by company_id, indexed queries |
| Multi-tenant data isolation                | RLS policies + session variable enforcement |
| Ledger immutability compliance             | Database triggers prevent raw modifications |
| Frontend performance with large item lists | Virtualized FlatList, local search index    |

---

## Open Questions

1. **System Accounts:** Should we auto-create default system accounts (1100 Bank, 1200 A/R, 2200 Tax Liability, 4000 Revenue) on company onboarding?
2. **Fiscal Year:** How should we handle fiscal year transitions for invoice numbering?
3. **Credit Notes:** Should we implement Credit/Debit Notes for returns and adjustments?
4. **Bank Reconciliation:** Is bank reconciliation needed in this phase?
5. **Dashboard Widgets:** Should we add accounting summary widgets to the company dashboard?

---

## References

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Trigger Documentation](https://www.postgresql.org/docs/current/triggers.html)
- [GAAP Revenue Recognition](https://www.fasb.org/page/PageContent?pageId=/standards/accounting-standards-codification.html)
