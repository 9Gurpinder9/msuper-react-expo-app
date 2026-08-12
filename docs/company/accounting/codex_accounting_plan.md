# Codex Accounting, Invoicing, Inventory & Finance Plan

## 1. Purpose and scope

This plan defines a safe, phased implementation of accounting for the multi-tenant company workspace under `/company/accounting`. The initial market is India: amounts are stored in INR and sales tax supports CGST, SGST, and IGST.

The system must provide a trustworthy double-entry ledger, sales invoicing, customer payments, configurable inventory controls, collections follow-ups, and reports. It must never permit a posted accounting document to become unbalanced, silently change historic values, or cross company boundaries.

### In scope

- Chart of accounts, fiscal periods, general journals, reversals, day book, and trial balance.
- Sales invoices, GST calculation, customer receivables, cash/bank receipts, and payment allocation.
- Item catalogue, stock movements, negative-stock policy, and weighted-average inventory costing.
- Installments, overdue aging, and follow-up notes.
- Company-scoped permissions, audit events, backend APIs, Expo Router screens, and automated tests.

### Not in the first release

- Multi-currency, foreign-exchange revaluation, payroll, fixed assets, consolidation, statutory return filing, and full purchasing workflows.
- Physical stock count mobile workflows, warehouses/bins, batches/serials, and multiple valuation methods.
- Database partitioning before measured tenant and ledger volume justifies it.

## 2. Architecture decisions

### ADR-001: One posting boundary

Only a privileged PostgreSQL RPC/function may create posted ledger, stock, payment, or rollup state. HTTP controllers validate request shape and permission, then invoke the RPC. Direct client writes to posted tables are prohibited.

**Why:** one transaction can lock the document, check every invariant, write all dependent rows, and commit or roll back as a unit. This is safer than coordinating application writes and independent triggers.

### ADR-002: Draft source documents, immutable posted facts

Draft journals and draft invoices can be edited. Posting copies their approved values into immutable journal and ledger facts. A posted document is corrected with a linked reversal or credit note, never by editing or deleting it.

### ADR-003: Database is the accounting authority

The database validates balance, period status, ownership, idempotency, stock availability, and tax/amount consistency. API and frontend validation improve usability but are not a security boundary.

### ADR-004: Tenant context and authorization are explicit

Every accounting table has `company_id`. Tenant-aware foreign keys prevent cross-company links. The backend establishes tenant context for each database transaction, and the service-role backend validates the authenticated company membership and permission before invoking a posting RPC.

### ADR-005: Read models are rebuildable

`account_balances`, invoice totals, and stock balances are cached read models maintained only by the posting/reversal path. Ledger and stock movement facts remain the source of truth; reconciliation jobs can rebuild summaries.

## 3. Non-negotiable invariants

1. Every posted journal has at least two lines and `SUM(debit) = SUM(credit)` rounded to the currency precision.
2. A posted ledger line cannot be updated or deleted. A posted journal header cannot be edited, unposted, or deleted.
3. Each source document can be posted at most once. Retrying a request with the same idempotency key returns the original result.
4. All related records belong to the same company.
5. A posting date must be in an open fiscal period.
6. Invoice line totals and GST totals are recomputed server-side; client-provided totals are never trusted.
7. When negative stock is disabled, stock-changing posting locks applicable item balances and rejects insufficient available quantity.
8. Payments cannot allocate more than their posted amount; invoice and installment allocations cannot exceed their outstanding amount.
9. Historic invoices retain snapshots of description, SKU, price, discount, tax components, account mappings, and inventory cost used at posting.
10. Reversals reference their original posted document and may only reverse it once, unless an authorized explicit adjustment workflow is introduced later.

## 4. Security and tenancy model

### 4.1 Backend authorization

- Continue mounting all routes under `/company/accounting` behind the existing `appSecretGuard` and add an accounting permission guard.
- Resolve the authenticated actor and permitted `company_id` before every service call. Never accept `company_id` from the request body as authorization.
- Keep the Supabase service-role key on the backend only. Service role bypasses RLS, therefore the service layer must verify membership and capability before every query/RPC.
- Use roles such as `ACCOUNTING_VIEWER`, `ACCOUNTING_CLERK`, `ACCOUNTING_APPROVER`, and `ACCOUNTING_ADMIN`. Posting and reversal require approver or admin permission.

### 4.2 RLS

- Enable and force RLS on every accounting table, including settings, taxes, contacts, invoice lines, stock movements, payments, journals, ledger lines, fiscal periods, idempotency records, and audit events.
- For direct authenticated access, policies use both `USING` and `WITH CHECK` based on a safely established tenant context. Use `current_setting('app.current_company_id', true)` so a missing context fails closed.
- The backend must set context transaction-locally (for example `set_config('app.current_company_id', company_id::text, true)`) before tenant-scoped calls.
- Security-definer posting functions must set a safe `search_path`, validate company ownership internally, and revoke direct execute/write rights from untrusted roles.

### 4.3 Tenant-aware keys

Each tenant-owned master table has `UNIQUE (company_id, id)`. Dependent tables use composite foreign keys, for example:

```sql
FOREIGN KEY (company_id, contact_id) REFERENCES contacts (company_id, id);
FOREIGN KEY (company_id, item_id) REFERENCES items (company_id, id);
FOREIGN KEY (company_id, account_id) REFERENCES accounts (company_id, id);
```

This is mandatory for invoice lines, ledger lines, tax components, payment allocations, stock movements, journal relations, and account hierarchy links.

## 5. Core data model

All money values are `NUMERIC(19,4)` in the MVP. Presentation uses INR rounding rules; the posting function applies one canonical rounding policy. Business dates use `DATE`; audit and event timestamps use `TIMESTAMPTZ`.

### 5.1 Configuration and periods

- `company_accounting_settings`: `company_id`, `currency` default `INR`, `allow_negative_stock` default `true`, default cash/bank, receivable, revenue, GST payable, inventory, and COGS account IDs.
- `fiscal_periods`: company, name, start/end date, `OPEN | CLOSED`, closed metadata. Posting into a closed period fails.
- `accounting_audit_events`: company, actor, entity type/id, action, immutable JSON metadata, timestamp, request ID.
- `idempotency_keys`: company, operation, client key, request hash, result entity/id, created timestamp; unique on `(company_id, operation, client_key)`.

### 5.2 Chart of accounts

`accounts` has company, code, name, account type (`ASSET`, `LIABILITY`, `EQUITY`, `REVENUE`, `EXPENSE`), optional tenant-aware parent, normal balance, system/active flags, and audit fields. Enforce unique `(company_id, account_code)`. System accounts may not be deactivated or remapped once postings reference them.

### 5.3 Journal drafts and posted ledger

- `journal_entries`: company, entry number, source type/id, posting date, description, state `DRAFT | POSTED | REVERSED`, immutable posting/reversal metadata, and audit fields.
- `journal_draft_lines`: editable draft lines with company, journal, account, debit, credit, memo, and display sequence.
- `ledger_lines`: immutable generated facts with company, posted journal, account, debit, credit, source type/id, posting date, line sequence, snapshots, actor, and timestamp.
- `account_balances`: company/account key, debit/credit totals, current signed balance, timestamp. It is a cache, not a substitute for ledger history.

Draft lines enforce a non-zero debit xor credit. The posting routine additionally enforces at least two lines and equal debit/credit totals. Posted lines are created only by the posting routine—not while drafting.

### 5.4 Tax, contacts, and items

- `tax_classes`: company, name, total rate, active flag, effective dates.
- `tax_components`: company, tax class, `CGST | SGST | IGST`, rate, display order. Validate that active component rates equal the class rate and that a sale uses either CGST+SGST or IGST according to place-of-supply rules.
- `contacts`: company, customer/supplier role, legal/trade name, billing address, state code, GSTIN/tax number, email and phone. Do not rely on a mutable outstanding balance as the financial authority.
- `items`: company, SKU, barcode, description, unit, service/inventory flag, default selling price, default accounts, default tax class, and active flag. Unique `(company_id, sku)`.
- `item_stock_balances`: company/item key, on-hand quantity, weighted-average unit cost, timestamp; maintained only by stock posting.
- `stock_movements`: immutable company/item facts with signed quantity, unit cost, total cost, movement type, source type/id, posting date, and actor.

Weighted-average costing is the MVP method. A sale uses the locked current weighted-average cost; purchases/positive adjustments update average cost atomically. Future FIFO or warehouse support requires separate ADRs and migrations.

### 5.5 Invoicing and payments

- `invoices`: company, invoice number, customer, issue/due date, status `DRAFT | POSTED | PARTIALLY_PAID | PAID | VOID | REVERSED`, source journal ID, and immutable post snapshots/totals.
- `invoice_draft_lines`: editable item/service selection, quantity, unit price, discount, and draft tax choice.
- `invoice_posted_lines`: immutable snapshots of item/SKU/description, quantity, unit price, discount, tax breakdown, row total, income/tax/inventory/COGS account mapping, and unit cost.
- `payments`: company, receipt number, customer, payment date, cash/bank account, amount, method, reference, status, and source journal ID.
- `payment_allocations`: company, payment, invoice, optional installment, amount; unique constraints and posting validation prevent over-allocation.
- `finance_installments`: company, invoice, sequence, due date, scheduled amount, status. Schedule amount must equal invoice total after posting.
- `finance_follow_ups`: company, contact, optional invoice/installment, remark, scheduled date, completion state, creator, and timestamp.

Invoice paid and outstanding totals are calculated from posted payment allocations or are safely denormalized only within the same payment transaction. A receipt creates its own balanced journal (cash/bank debit, accounts-receivable credit), then applies allocations.

### 5.6 Reference PostgreSQL/Supabase DDL

This is the target logical schema for new Supabase migrations. It deliberately does not guess the existing company or membership table name: replace `public.companies(id)` with the project’s canonical company table when writing the migration. `created_by` and `updated_by` are actor UUID snapshots; use an FK to the canonical user profile only if that table is immutable enough for accounting retention.

#### 5.6.1 Shared types and master tables

```sql
create type accounting_account_type as enum
  ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE');
create type accounting_normal_balance as enum ('DEBIT', 'CREDIT');
create type accounting_document_state as enum
  ('DRAFT', 'POSTED', 'REVERSED', 'VOID');
create type accounting_source_type as enum
  ('MANUAL_JOURNAL', 'SALES_INVOICE', 'PAYMENT', 'CREDIT_NOTE',
   'STOCK_ADJUSTMENT', 'OPENING_BALANCE', 'REVERSAL');
create type accounting_tax_component_type as enum ('CGST', 'SGST', 'IGST');
create type accounting_contact_type as enum ('CUSTOMER', 'SUPPLIER', 'BOTH');
create type accounting_item_type as enum ('SERVICE', 'INVENTORY');
create type accounting_stock_movement_type as enum
  ('OPENING', 'PURCHASE', 'SALE', 'SALE_RETURN', 'ADJUSTMENT_IN',
   'ADJUSTMENT_OUT', 'REVERSAL');
create type accounting_payment_method as enum
  ('CASH', 'BANK_TRANSFER', 'UPI', 'CARD', 'CHEQUE', 'OTHER');
create type accounting_payment_state as enum ('DRAFT', 'POSTED', 'REVERSED');
create type accounting_installment_state as enum
  ('PENDING', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED');
create type accounting_follow_up_state as enum ('OPEN', 'COMPLETED', 'CANCELLED');
create type accounting_period_state as enum ('OPEN', 'CLOSED');

-- One company-level accounting configuration record. It defines the MVP currency,
-- inventory policy, document sequencing, and the system accounts used by posting
-- functions when a source document does not explicitly choose an account.
create table company_accounting_settings (
  company_id uuid primary key references public.companies(id) on delete restrict,
  currency_code varchar(3) not null default 'INR' check (currency_code = 'INR'),
  allow_negative_stock boolean not null default true,
  default_cash_account_id uuid,
  default_receivable_account_id uuid,
  default_revenue_account_id uuid,
  default_inventory_account_id uuid,
  default_cogs_account_id uuid,
  default_cgst_payable_account_id uuid,
  default_sgst_payable_account_id uuid,
  default_igst_payable_account_id uuid,
  invoice_number_prefix varchar(20) not null default 'INV-',
  next_invoice_sequence bigint not null default 1 check (next_invoice_sequence > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null,
  updated_by uuid not null
);

-- The accounting calendar for a company. Posting functions use this table to
-- prevent new financial facts from being written into a closed reporting period.
create table fiscal_periods (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  name varchar(100) not null,
  starts_on date not null,
  ends_on date not null,
  state accounting_period_state not null default 'OPEN',
  closed_at timestamptz,
  closed_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null,
  updated_by uuid not null,
  constraint fiscal_period_range check (starts_on <= ends_on),
  constraint fiscal_period_closed_metadata check (
    (state = 'OPEN' and closed_at is null and closed_by is null) or
    (state = 'CLOSED' and closed_at is not null and closed_by is not null)
  ),
  unique (company_id, id),
  unique (company_id, name),
  unique (company_id, starts_on, ends_on)
);

-- The company chart of accounts. Each row is a postable or grouping account whose
-- type and normal balance define how its ledger balance appears in financial reports.
create table accounts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  account_code varchar(50) not null,
  name varchar(150) not null,
  account_type accounting_account_type not null,
  normal_balance accounting_normal_balance not null,
  parent_id uuid,
  is_system boolean not null default false,
  is_active boolean not null default true,
  allow_manual_posting boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null,
  updated_by uuid not null,
  unique (company_id, id),
  unique (company_id, account_code),
  unique (company_id, name),
  foreign key (company_id, parent_id) references accounts(company_id, id) on delete restrict,
  constraint account_parent_not_self check (parent_id is null or parent_id <> id),
  constraint account_normal_balance_matches_type check (
    (account_type in ('ASSET', 'EXPENSE') and normal_balance = 'DEBIT') or
    (account_type in ('LIABILITY', 'EQUITY', 'REVENUE') and normal_balance = 'CREDIT')
  )
);

alter table company_accounting_settings
  add foreign key (company_id, default_cash_account_id)
    references accounts(company_id, id) on delete restrict,
  add foreign key (company_id, default_receivable_account_id)
    references accounts(company_id, id) on delete restrict,
  add foreign key (company_id, default_revenue_account_id)
    references accounts(company_id, id) on delete restrict,
  add foreign key (company_id, default_inventory_account_id)
    references accounts(company_id, id) on delete restrict,
  add foreign key (company_id, default_cogs_account_id)
    references accounts(company_id, id) on delete restrict,
  add foreign key (company_id, default_cgst_payable_account_id)
    references accounts(company_id, id) on delete restrict,
  add foreign key (company_id, default_sgst_payable_account_id)
    references accounts(company_id, id) on delete restrict,
  add foreign key (company_id, default_igst_payable_account_id)
    references accounts(company_id, id) on delete restrict;

-- A reusable GST tax definition, versioned by effective date. It represents the
-- total rate and is selected by an item or invoice draft line before posting.
create table tax_classes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  name varchar(100) not null,
  total_rate numeric(9,4) not null check (total_rate >= 0 and total_rate <= 100),
  effective_from date not null default current_date,
  effective_to date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null,
  updated_by uuid not null,
  unique (company_id, id),
  unique (company_id, name, effective_from),
  check (effective_to is null or effective_to >= effective_from)
);

-- The individual CGST, SGST, or IGST components belonging to a tax class. The
-- posting flow snapshots these components onto an invoice for historical accuracy.
create table tax_components (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  tax_class_id uuid not null,
  component_type accounting_tax_component_type not null,
  rate numeric(9,4) not null check (rate >= 0 and rate <= 100),
  display_order smallint not null check (display_order > 0),
  created_at timestamptz not null default now(),
  created_by uuid not null,
  unique (company_id, id),
  unique (company_id, tax_class_id, component_type),
  unique (company_id, tax_class_id, display_order),
  foreign key (company_id, tax_class_id) references tax_classes(company_id, id) on delete cascade
);

-- The shared customer/supplier master. It contains operational contact and GST
-- data only; receivable and payable balances are derived from posted transactions.
create table contacts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  contact_type accounting_contact_type not null default 'CUSTOMER',
  legal_name varchar(200) not null,
  display_name varchar(200) not null,
  email varchar(255),
  phone varchar(50),
  gstin varchar(20),
  tax_number varchar(100),
  billing_address jsonb not null default '{}'::jsonb,
  shipping_address jsonb,
  state_code varchar(10),
  payment_terms_days integer not null default 0 check (payment_terms_days >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null,
  updated_by uuid not null,
  unique (company_id, id)
);

-- The sellable service or inventory-item master. It provides current defaults for
-- price, tax, and account mappings; posted invoice lines retain their own snapshots.
create table items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  item_type accounting_item_type not null,
  sku varchar(100) not null,
  barcode varchar(100),
  name varchar(150) not null,
  description text,
  unit_of_measure varchar(20) not null default 'NOS',
  default_sale_price numeric(19,4) not null default 0 check (default_sale_price >= 0),
  default_tax_class_id uuid,
  inventory_account_id uuid,
  income_account_id uuid not null,
  cogs_account_id uuid,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null,
  updated_by uuid not null,
  unique (company_id, id),
  unique (company_id, sku),
  foreign key (company_id, default_tax_class_id) references tax_classes(company_id, id) on delete restrict,
  foreign key (company_id, inventory_account_id) references accounts(company_id, id) on delete restrict,
  foreign key (company_id, income_account_id) references accounts(company_id, id) on delete restrict,
  foreign key (company_id, cogs_account_id) references accounts(company_id, id) on delete restrict,
  check ((item_type = 'SERVICE' and inventory_account_id is null and cogs_account_id is null) or
         (item_type = 'INVENTORY' and inventory_account_id is not null and cogs_account_id is not null))
);
```

#### 5.6.2 Journals, immutable ledger facts, and read models

```sql
-- The journal header and document lifecycle record. A DRAFT header owns editable
-- draft lines; a POSTED header identifies immutable ledger lines and reversal links.
create table journal_entries (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  entry_number varchar(100) not null,
  source_type accounting_source_type not null,
  source_id uuid,
  posting_date date not null,
  description text,
  state accounting_document_state not null default 'DRAFT',
  draft_version integer not null default 1 check (draft_version > 0),
  posted_at timestamptz,
  posted_by uuid,
  reversed_by_journal_id uuid,
  reversal_of_journal_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null,
  updated_by uuid not null,
  unique (company_id, id),
  unique (company_id, entry_number),
  foreign key (company_id, reversed_by_journal_id) references journal_entries(company_id, id) on delete restrict,
  foreign key (company_id, reversal_of_journal_id) references journal_entries(company_id, id) on delete restrict,
  check ((state = 'DRAFT' and posted_at is null and posted_by is null) or
         (state in ('POSTED', 'REVERSED') and posted_at is not null and posted_by is not null)),
  check (reversed_by_journal_id is null or reversed_by_journal_id <> id),
  check (reversal_of_journal_id is null or reversal_of_journal_id <> id)
);

-- Editable debit/credit instructions for a draft journal. These are not financial
-- facts and are copied into ledger_lines only after the posting function balances them.
create table journal_draft_lines (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  journal_entry_id uuid not null,
  line_number integer not null check (line_number > 0),
  account_id uuid not null,
  debit numeric(19,4) not null default 0 check (debit >= 0),
  credit numeric(19,4) not null default 0 check (credit >= 0),
  memo varchar(500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null,
  updated_by uuid not null,
  unique (company_id, id),
  unique (company_id, journal_entry_id, line_number),
  foreign key (company_id, journal_entry_id) references journal_entries(company_id, id) on delete cascade,
  foreign key (company_id, account_id) references accounts(company_id, id) on delete restrict,
  check ((debit > 0 and credit = 0) or (debit = 0 and credit > 0))
);

-- The immutable double-entry accounting facts. Each row records one debit or credit
-- on a posted journal and includes account snapshots so historic reports remain stable.
create table ledger_lines (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  journal_entry_id uuid not null,
  line_number integer not null check (line_number > 0),
  account_id uuid not null,
  posting_date date not null,
  source_type accounting_source_type not null,
  source_id uuid,
  debit numeric(19,4) not null default 0 check (debit >= 0),
  credit numeric(19,4) not null default 0 check (credit >= 0),
  memo varchar(500),
  account_code_snapshot varchar(50) not null,
  account_name_snapshot varchar(150) not null,
  created_at timestamptz not null default now(),
  created_by uuid not null,
  unique (company_id, id),
  unique (company_id, journal_entry_id, line_number),
  foreign key (company_id, journal_entry_id) references journal_entries(company_id, id) on delete restrict,
  foreign key (company_id, account_id) references accounts(company_id, id) on delete restrict,
  check ((debit > 0 and credit = 0) or (debit = 0 and credit > 0))
);

-- A rebuildable per-account rollup used to accelerate balances and dashboards. The
-- immutable ledger_lines table remains the source of truth for every reconciliation.
create table account_balances (
  company_id uuid not null,
  account_id uuid not null,
  total_debit numeric(19,4) not null default 0,
  total_credit numeric(19,4) not null default 0,
  current_balance numeric(19,4) not null default 0,
  updated_at timestamptz not null default now(),
  primary key (company_id, account_id),
  foreign key (company_id, account_id) references accounts(company_id, id) on delete restrict
);

-- Append-only operational audit trail for accounting-sensitive actions, including
-- posting, reversal, configuration changes, and actor/request context for investigation.
create table accounting_audit_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  entity_type varchar(64) not null,
  entity_id uuid not null,
  action varchar(64) not null,
  actor_id uuid not null,
  request_id varchar(100),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (company_id, id)
);

-- Retry-deduplication record for every financial mutation. It binds a client key and
-- request hash to the original outcome so network retries cannot create duplicate facts.
create table idempotency_keys (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  operation varchar(64) not null,
  client_key varchar(255) not null,
  request_hash char(64) not null,
  result_entity_type varchar(64),
  result_entity_id uuid,
  result_payload jsonb,
  created_at timestamptz not null default now(),
  unique (company_id, operation, client_key),
  check ((result_entity_type is null and result_entity_id is null) or
         (result_entity_type is not null and result_entity_id is not null))
);
```

#### 5.6.3 Invoices, payments, collections, and inventory

```sql
-- The sales-invoice header. It holds the customer, dates, document state, computed
-- totals, and link to the journal created when the invoice becomes financially posted.
create table invoices (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  invoice_number varchar(100),
  customer_id uuid not null,
  issue_date date not null,
  due_date date not null,
  place_of_supply_state_code varchar(10),
  state accounting_document_state not null default 'DRAFT',
  draft_version integer not null default 1 check (draft_version > 0),
  subtotal numeric(19,4) not null default 0 check (subtotal >= 0),
  discount_total numeric(19,4) not null default 0 check (discount_total >= 0),
  taxable_total numeric(19,4) not null default 0 check (taxable_total >= 0),
  tax_total numeric(19,4) not null default 0 check (tax_total >= 0),
  grand_total numeric(19,4) not null default 0 check (grand_total >= 0),
  paid_total numeric(19,4) not null default 0 check (paid_total >= 0),
  outstanding_total numeric(19,4) not null default 0 check (outstanding_total >= 0),
  source_journal_id uuid,
  notes text,
  posted_at timestamptz,
  posted_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null,
  updated_by uuid not null,
  unique (company_id, id),
  foreign key (company_id, customer_id) references contacts(company_id, id) on delete restrict,
  foreign key (company_id, source_journal_id) references journal_entries(company_id, id) on delete restrict,
  check (due_date >= issue_date),
  check (paid_total + outstanding_total = grand_total),
  check ((state = 'DRAFT' and invoice_number is null and posted_at is null) or
         (state in ('POSTED', 'REVERSED') and invoice_number is not null and posted_at is not null) or
         state = 'VOID')
);

-- Editable commercial lines for a draft invoice. The server recalculates taxes and
-- totals from these values; they must not be treated as immutable accounting history.
create table invoice_draft_lines (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  invoice_id uuid not null,
  line_number integer not null check (line_number > 0),
  item_id uuid not null,
  description_override text,
  quantity numeric(19,4) not null check (quantity > 0),
  unit_price numeric(19,4) not null check (unit_price >= 0),
  discount_percent numeric(9,4) not null default 0 check (discount_percent between 0 and 100),
  tax_class_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null,
  updated_by uuid not null,
  unique (company_id, id),
  unique (company_id, invoice_id, line_number),
  foreign key (company_id, invoice_id) references invoices(company_id, id) on delete cascade,
  foreign key (company_id, item_id) references items(company_id, id) on delete restrict,
  foreign key (company_id, tax_class_id) references tax_classes(company_id, id) on delete restrict
);

-- Immutable invoice-line snapshots generated at posting. They preserve the sold item,
-- GST breakdown, pricing, account choices, and cost used to create historic entries.
create table invoice_posted_lines (0
0 0 0i0d0 0u0u0i0d0 0p0r0i0m0a0r0y0 0k0e0y0 0d0e0f0a0u0l0t0 0g0e0n0_0r0a0n0d0o0m0_0u0u0i0d0(0)0,0
0 0 0company_id uuid not null,
  invoice_id uuid not null,
  line_number integer not null check (line_number > 0),
  item_id uuid,
  sku_snapshot varchar(100),
  item_name_snapshot varchar(150) not null,
  description_snapshot text,
  item_type_snapshot accounting_item_type not null,
  quantity numeric(19,4) not null check (quantity > 0),
  unit_of_measure_snapshot varchar(20) not null,
  unit_price numeric(19,4) not null check (unit_price >= 0),
  discount_percent numeric(9,4) not null check (discount_percent between 0 and 100),
  discount_amount numeric(19,4) not null check (discount_amount >= 0),
  taxable_amount numeric(19,4) not null check (taxable_amount >= 0),
  tax_breakdown jsonb not null,
  tax_amount numeric(19,4) not null check (tax_amount >= 0),
  line_total numeric(19,4) not null check (line_total >= 0),
  income_account_id uuid not null,
  inventory_account_id uuid,
  cogs_account_id uuid,
  unit_cost_snapshot numeric(19,4) not null default 0 check (unit_cost_snapshot >= 0),
  created_at timestamptz not null default now(),
  created_by uuid not null,
  unique (company_id, id),
  unique (company_id, invoice_id, line_number),
  foreign key (company_id, invoice_id) references invoices(company_id, id) on delete restrict,
  foreign key (company_id, item_id) references items(company_id, id) on delete restrict,
  foreign key (company_id, income_account_id) references accounts(company_id, id) on delete restrict,
  foreign key (company_id, inventory_account_id) references accounts(company_id, id) on delete restrict,
  foreign key (company_id, cogs_account_id) references accounts(company_id, id) on delete restrict
);

-- Contractual due-date schedule for an invoice. Payment allocations update paid_amount
-- and state; the sum of scheduled amounts must match the posted invoice total.
create table finance_installments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  invoice_id uuid not null,
  installment_number integer not null check (installment_number > 0),
  due_date date not null,
  scheduled_amount numeric(19,4) not null check (scheduled_amount > 0),
  paid_amount numeric(19,4) not null default 0 check (paid_amount >= 0),
  state accounting_installment_state not null default 'PENDING',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null,
  updated_by uuid not null,
  unique (company_id, id),
  unique (company_id, invoice_id, installment_number),
  foreign key (company_id, invoice_id) references invoices(company_id, id) on delete restrict,
  check (paid_amount <= scheduled_amount)
);

-- A customer receipt draft or posted receipt. Once posted it creates the cash/bank to
-- receivables journal and becomes immutable; allocations explain which invoices it settles.
create table payments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  receipt_number varchar(100),
  customer_id uuid not null,
  payment_date date not null,
  payment_method accounting_payment_method not null,
  deposit_account_id uuid not null,
  amount numeric(19,4) not null check (amount > 0),
  allocated_total numeric(19,4) not null default 0 check (allocated_total >= 0),
  reference_number varchar(100),
  notes text,
  state accounting_payment_state not null default 'DRAFT',
  draft_version integer not null default 1 check (draft_version > 0),
  source_journal_id uuid,
  posted_at timestamptz,
  posted_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null,
  updated_by uuid not null,
  unique (company_id, id),
  foreign key (company_id, customer_id) references contacts(company_id, id) on delete restrict,
  foreign key (company_id, deposit_account_id) references accounts(company_id, id) on delete restrict,
  foreign key (company_id, source_journal_id) references journal_entries(company_id, id) on delete restrict,
  check (allocated_total <= amount),
  check ((state = 'DRAFT' and receipt_number is null and posted_at is null) or
         (state in ('POSTED', 'REVERSED') and receipt_number is not null and posted_at is not null))
);

-- Links a posted payment to one or more invoices and, optionally, installments. It is
-- the traceable source for paid/outstanding totals and prevents ambiguous receipt handling.
create table payment_allocations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  payment_id uuid not null,
  invoice_id uuid not null,
  installment_id uuid,
  amount numeric(19,4) not null check (amount > 0),
  created_at timestamptz not null default now(),
  created_by uuid not null,
  unique (company_id, id),
  unique (company_id, payment_id, invoice_id, installment_id),
  foreign key (company_id, payment_id) references payments(company_id, id) on delete restrict,
  foreign key (company_id, invoice_id) references invoices(company_id, id) on delete restrict,
  foreign key (company_id, installment_id) references finance_installments(company_id, id) on delete restrict
);

-- Rebuildable current stock position for each inventory item, maintained atomically with
-- stock_movements. It is locked by posting functions to enforce the negative-stock policy.
create table item_stock_balances (
  company_id uuid not null,
  item_id uuid not null,
  on_hand_quantity numeric(19,4) not null default 0,
  weighted_average_unit_cost numeric(19,4) not null default 0 check (weighted_average_unit_cost >= 0),
  updated_at timestamptz not null default now(),
  primary key (company_id, item_id),
  foreign key (company_id, item_id) references items(company_id, id) on delete restrict
);

-- Immutable quantity and valuation facts for every inventory event. These movements are
-- the source of truth for stock history, COGS, returns, and rebuilding stock balances.
create table stock_movements (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  item_id uuid not null,
  movement_type accounting_stock_movement_type not null,
  quantity_delta numeric(19,4) not null check (quantity_delta <> 0),
  unit_cost numeric(19,4) not null check (unit_cost >= 0),
  total_cost numeric(19,4) not null check (total_cost >= 0),
  posting_date date not null,
  source_type accounting_source_type not null,
  source_id uuid not null,
  source_line_id uuid,
  reversal_of_movement_id uuid,
  created_at timestamptz not null default now(),
  created_by uuid not null,
  unique (company_id, id),
  unique (company_id, source_type, source_id, source_line_id, movement_type),
  foreign key (company_id, item_id) references items(company_id, id) on delete restrict,
  foreign key (company_id, reversal_of_movement_id) references stock_movements(company_id, id) on delete restrict,
  check (reversal_of_movement_id is null or reversal_of_movement_id <> id)
);

-- Human collection-work record for an outstanding customer balance, invoice, or
-- installment. It deliberately does not affect accounting balances or payment status.
create table finance_follow_ups (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  customer_id uuid not null,
  invoice_id uuid,
  installment_id uuid,
  remark text not null check (length(trim(remark)) > 0),
  scheduled_for date not null,
  state accounting_follow_up_state not null default 'OPEN',
  completed_at timestamptz,
  completed_by uuid,
  created_at timestamptz not null default now(),
  created_by uuid not null,
  foreign key (company_id, customer_id) references contacts(company_id, id) on delete restrict,
  foreign key (company_id, invoice_id) references invoices(company_id, id) on delete restrict,
  foreign key (company_id, installment_id) references finance_installments(company_id, id) on delete restrict,
  check ((state = 'COMPLETED' and completed_at is not null and completed_by is not null) or
         (state in ('OPEN', 'CANCELLED') and completed_at is null and completed_by is null))
);
```

#### 5.6.4 Required indexes, RLS, and mutation guards

```sql
create index accounts_company_active_idx on accounts(company_id, is_active, account_code);
create unique index contacts_company_gstin_unique_idx
  on contacts(company_id, gstin) where gstin is not null;
create unique index items_company_barcode_unique_idx
  on items(company_id, barcode) where barcode is not null;
create index journal_entries_company_date_idx on journal_entries(company_id, posting_date desc, state);
create unique index journal_entries_company_source_unique_idx
  on journal_entries(company_id, source_type, source_id) where source_id is not null;
create index ledger_lines_company_account_date_idx on ledger_lines(company_id, account_id, posting_date desc);
create index ledger_lines_company_source_idx on ledger_lines(company_id, source_type, source_id);
create index invoices_company_status_due_idx on invoices(company_id, state, due_date);
create unique index invoices_company_invoice_number_unique_idx
  on invoices(company_id, invoice_number) where invoice_number is not null;
create index payments_company_customer_date_idx on payments(company_id, customer_id, payment_date desc);
create unique index payments_company_receipt_number_unique_idx
  on payments(company_id, receipt_number) where receipt_number is not null;
create index installments_company_state_due_idx on finance_installments(company_id, state, due_date);
create index stock_movements_company_item_date_idx on stock_movements(company_id, item_id, posting_date desc);
create index follow_ups_company_state_date_idx on finance_follow_ups(company_id, state, scheduled_for);
create index audit_events_company_entity_idx on accounting_audit_events(company_id, entity_type, entity_id, created_at desc);

-- Apply this to every tenant-owned accounting table listed above.
alter table accounts enable row level security;
alter table accounts force row level security;
create policy accounts_tenant_policy on accounts
  for all
  using (company_id::text = current_setting('app.current_company_id', true))
  with check (company_id::text = current_setting('app.current_company_id', true));

-- Generate equivalent policies for all remaining tenant-owned tables.
-- Do not expose INSERT/UPDATE/DELETE on ledger_lines, stock_movements,
-- invoice_posted_lines, account_balances, or accounting_audit_events to clients.

create or replace function guard_immutable_accounting_fact()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  raise exception 'Immutable accounting fact: % cannot be changed', tg_table_name;
end;
$$;

create trigger ledger_lines_immutable
before update or delete on ledger_lines
for each row execute function guard_immutable_accounting_fact();
create trigger stock_movements_immutable
before update or delete on stock_movements
for each row execute function guard_immutable_accounting_fact();
create trigger invoice_posted_lines_immutable
before update or delete on invoice_posted_lines
for each row execute function guard_immutable_accounting_fact();
```

The migration also needs a journal-state trigger that rejects updates/deletes when `OLD.state <> 'DRAFT'`, while allowing the controlled posting function to make its one state transition. Use a private database role or a transaction-local trusted setting for that function; do not leave a client-settable bypass flag.

#### 5.6.5 Posting RPC contracts

The SQL body must be supplied in an implementation migration, after it is reviewed against the actual company/membership schema. Its stable contracts are:

```sql
post_journal_entry(
  p_company_id uuid, p_journal_id uuid, p_actor_id uuid,
  p_expected_version integer, p_idempotency_key text
) returns jsonb;

post_invoice(
  p_company_id uuid, p_invoice_id uuid, p_actor_id uuid,
  p_expected_version integer, p_idempotency_key text
) returns jsonb;

post_payment(
  p_company_id uuid, p_payment_id uuid, p_actor_id uuid,
  p_expected_version integer, p_idempotency_key text
) returns jsonb;

reverse_posted_document(
  p_company_id uuid, p_journal_id uuid, p_actor_id uuid,
  p_reason text, p_idempotency_key text
) returns jsonb;
```

Each function is `SECURITY DEFINER`, sets a fixed `search_path`, performs authorization and ownership checks, inserts/locks its idempotency record first, and returns the prior result for an identical retry. It must reject reuse of a key with a different request hash.

## 6. Atomic posting workflows

### 6.1 `post_journal_entry`

Input: company, draft journal ID, actor, idempotency key, and expected draft version.

Within one transaction it:

1. Validates actor permission, tenant ownership, idempotency record, draft state, and open fiscal period.
2. Locks the draft journal and lines (`FOR UPDATE`) and verifies the version to prevent lost updates.
3. Validates non-zero lines, at least two lines, tenant-owned active accounts, and exact debit/credit equality.
4. Creates immutable `ledger_lines`, updates `account_balances`, changes state to `POSTED`, and writes an audit event.
5. Stores the idempotent result and commits. Any error rolls back all writes.

### 6.2 `post_invoice`

Input: company, invoice ID, actor, idempotency key, and expected draft version.

Within one transaction it locks the invoice and lines, validates the customer, recalculates all discount/GST totals, snapshots item/tax/accounts, validates the fiscal period, and creates the sales journal:

- Debit Accounts Receivable for grand total.
- Credit Revenue for pre-tax net amount.
- Credit GST liability accounts for each tax component.

For inventory-tracked items it locks `item_stock_balances` in a deterministic item-ID order. If negative stock is disallowed, it rejects short stock. It writes sale movements, decrements on-hand quantity, posts COGS debit and Inventory credit using weighted-average cost, then atomically posts its journal and marks the invoice posted.

### 6.3 `post_payment`

The function locks the payment, target invoice/installments, and their allocation rows. It validates allocation totals and unpaid balances, posts cash/bank debit and receivable credit, writes allocations, recalculates invoice/installment status, and records an audit event. Refunds and payment corrections are reversals/new payments, never mutation of a posted receipt.

### 6.4 Reversals and credits

`reverse_posted_document` creates a new journal with debit/credit swapped from the original ledger lines and links both documents. For sales returns, a credit-note workflow also creates reverse stock and COGS movements where appropriate. The original stays posted and visible forever.

## 7. Immutability, rollups, and operations

- Revoke `INSERT`, `UPDATE`, and `DELETE` on posted ledger, stock movement, posted invoice lines, and balance cache tables from application roles; grant controlled use only to functions.
- Use trigger guards as defense in depth: reject changes to posted journal headers and all mutations of immutable facts. Do not rely on a trigger alone as the posting engine.
- A reconciliation job compares ledger sums to `account_balances`, stock movements to stock balances, and allocations to invoice/installment status. It reports discrepancies and can rebuild caches from immutable facts under maintenance controls.
- Index tenant-ledger reads by `(company_id, posting_date, account_id)` and invoice aging by `(company_id, status, due_date)`. Add indexes based on measured queries.
- Do not partition solely by `company_id` prematurely. Revisit range partitioning by posting date (optionally subpartitioned) after documented volume/retention thresholds are met and operational tooling is ready.

## 8. Backend implementation

Create `backend/src/company/accounting/` with:

- `schemas.ts`: Joi validation for drafts, posting inputs, pagination, filters, and idempotency keys.
- `accounting.repository.ts`: scoped data access and RPC invocation only; no scattered ledger writes.
- `accounting.service.ts`: authorization context, request-to-RPC orchestration, error mapping, and read-model queries.
- `accounting.controller.ts` and `routes.ts`: REST handlers mounted only through `backend/src/routes/index.ts` at `/company/accounting`.
- `permissions.ts`: capability checks integrated with the established company authorization model.

Use `src/utils/logger.ts`, `fetchJson` conventions at the boundary, Joi middleware, request IDs, and the existing Supabase client. Avoid `console.*`. Every mutating route requires an idempotency key. Route examples:

- `POST /journals`, `PATCH /journals/:id`, `POST /journals/:id/post`, `POST /journals/:id/reverse`
- `POST /invoices`, `PATCH /invoices/:id`, `POST /invoices/:id/post`, `POST /invoices/:id/credit-note`
- `POST /payments`, `POST /payments/:id/post`
- registries for accounts, taxes, contacts, items, fiscal periods, and settings
- read endpoints for dashboard, day book, trial balance, stock, receivables aging, and follow-ups

Supabase migrations must be ordered: types/settings → masters → drafts/facts → posting functions and grants → RLS → indexes → system-account seed/migration. Every migration needs an explicit rollback/recovery note and a production backup checkpoint.

## 9. Frontend implementation

Create screens under `frontend/app/(app)/company/accounting/`:

- `index.tsx`: dashboard with receivables, cash/bank, stock, overdue, and recent-posting widgets.
- `accounts.tsx`, `items/index.tsx`, `contacts.tsx`, `taxes.tsx`, `fiscal-periods.tsx`, `settings.tsx`: administrative registries.
- `invoices/index.tsx`, `invoices/create.tsx`, and invoice detail/post/credit actions.
- `payments/index.tsx`, `payments/create.tsx` with visible allocation amounts and remaining balances.
- `journal-entries/index.tsx`, `journal-entries/create.tsx`, detail/post/reversal actions.
- `overdue/index.tsx`, `overdue/monthwise.tsx`, `reports/day-book.tsx`, and `reports/trial-balance.tsx`.

Company screens must mirror the super-admin references specified in `AGENTS.md`: use the same `TopAppBar`, drawer behavior, theme controls, registry list/table/dialog conventions, save overlay, validation colors, and typed toasts. Posting/destructive actions require a clear confirmation that states the document total and explains that corrections are made by reversal. Display draft, posted, reversed, and payment states distinctly; never imply a posted document can be edited.

Use `frontend/config/index.ts`, `fetchJson`, `useToast`, React Query mutations/invalidation, and AsyncStorage only for small view preferences. The frontend may show tax and stock previews, but its calculations are informational; server results are rendered as authoritative after save/post.

## 10. Phased delivery

### Phase 0 — Discovery and controls

Confirm company identity/roles, existing database ownership, GST requirements, invoice numbering, financial year, and migration/backup process. Produce schema migration review and threat model.

### Phase 1 — Accounting foundation

Deliver settings, fiscal periods, COA, draft journals, atomic journal posting, reversal, audit log, account rollups, day book, and trial balance. This phase is the release gate for all later financial modules.

### Phase 2 — Sales and receivables

Deliver contacts, tax configuration, draft/posted invoices with snapshots, invoice posting, payments and allocations, invoice status, receivables aging, and credit notes without inventory.

### Phase 3 — Inventory

Deliver items, stock opening balances, weighted-average stock movements, inventory/COGS journals, policy-controlled negative stock, adjustments, and sales return handling.

### Phase 4 — Collections and hardening

Deliver installment plans, follow-ups, overdue dashboards/monthly views, reconciliation tooling, permissions audit, performance monitoring, exports, and operational runbooks.

No phase proceeds until its posting/reversal and tenant-isolation tests pass.

## 11. Verification plan

### Database and service tests

- Balanced and unbalanced draft posting; zero/single-line rejection.
- Retry with the same idempotency key; concurrent posting of the same document; stale-version rejection.
- Cross-company foreign-key and RLS rejection for every relationship and query path.
- Closed-period rejection; posted-document mutation/deletion rejection; reversal behavior.
- GST calculation and line/header rounding cases.
- Partial/full/overpayment allocation, refunds, and invoice/installment status transitions.
- Concurrent stock sales with negative stock allowed and denied; weighted-average costing and return calculations.
- Rollup and stock-balance reconciliation against immutable facts.

### API and frontend tests

- Controller authorization and Joi validation tests for all mutation routes.
- Separate feature-specific web E2E files under `frontend/e2e/`; retain and restore authenticated `auth.json` state, target frontend `http://localhost:8081` and API `http://localhost:4000`, and self-heal test data before creation.
- E2E journeys: create/edit draft invoice, validate stock warning, post once, record and allocate payment, view trial balance/day book, create a reversal, and confirm the original remains immutable.
- When registry E2E is required on device, add a dedicated Maestro file under `frontend/e2e/` that creates a real entry through the UI.

After TypeScript edits, run the mandated targeted typechecks for each edited frontend/backend file. Before release, run workspace lint/typecheck, relevant tests, `npx expo-doctor`, and a staging backup/restore rehearsal.

## 12. Acceptance criteria

- A posted invoice produces a balanced, immutable ledger journal and correct GST breakdown.
- A posted inventory sale produces consistent stock, COGS, and inventory entries, obeying the company negative-stock setting under concurrency.
- A payment cannot over-allocate and accurately changes invoice/installment status.
- Every posted correction is a linked reversal or credit note; no historical fact is silently overwritten.
- Users cannot view or link another company's accounting data, whether through the API, direct database access, or an RPC parameter.
- Trial balance balances, day book ties to ledger facts, and reconciliation confirms read models match source facts.
- Company accounting screens match the project’s established company/super-admin UI patterns and surface actionable validation errors.
