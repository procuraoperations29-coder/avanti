-- ============================================================================
-- Money — payments, refunds, payouts, commission, tax, invoices
--
-- Phase 3 D15: payments (customer→Avanti) and payouts (Avanti→driver) are
-- TWO DISTINCT records, never merged. This encodes the merchant-of-record
-- accounting model. Customers never see payouts; drivers never see payments.
-- ============================================================================

-- We need `disputes` to be referenceable from `refunds` and `payouts`, but
-- disputes are defined in the next migration. Forward-declare via a stub.
create table disputes (
  id uuid primary key default gen_random_uuid(),
  case_number text not null unique,
  engagement_id uuid not null references engagements(id),
  raised_by_user_id uuid not null references users(id),
  respondent_user_id uuid references users(id),
  category dispute_category not null,
  severity dispute_severity not null default 'medium',
  status dispute_status not null default 'raised',
  summary text,
  triaged_at timestamptz,
  triaged_by uuid references users(id),
  respondent_notified_at timestamptz,
  response_deadline timestamptz,
  resolved_at timestamptz,
  resolved_by uuid references users(id),
  resolution_summary text,
  escrow_frozen boolean not null default false,
  escrow_frozen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_disputes_engagement on disputes (engagement_id);
create index idx_disputes_status_created on disputes (status, created_at desc);
create index idx_disputes_raised_by on disputes (raised_by_user_id, created_at desc);
create index idx_disputes_severity_open on disputes (severity, response_deadline)
  where status not in ('resolved_by_agreement', 'resolved_by_decision', 'withdrawn');

-- Customer → Avanti
create table payments (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references engagements(id),
  payer_user_id uuid references users(id),
  payer_organization_id uuid references organizations(id),
  provider text not null,
  provider_ref text,
  method_type payment_method_type not null,
  method_last4 char(4),
  currency currency_code not null,
  gross_amount numeric(15,2) not null,
  net_after_provider_fee numeric(15,2),
  provider_fee_amount numeric(15,2),
  status payment_status not null default 'pending',
  authorized_at timestamptz,
  captured_at timestamptz,
  refunded_at timestamptz,
  refunded_amount numeric(15,2) not null default 0,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payment_has_payer check (
    (payer_user_id is not null)::int + (payer_organization_id is not null)::int = 1
  )
);

create unique index uniq_payment_provider_ref on payments (provider, provider_ref)
  where provider_ref is not null;
create index idx_payments_engagement on payments (engagement_id);
create index idx_payments_payer_user on payments (payer_user_id, created_at desc);
create index idx_payments_payer_org on payments (payer_organization_id, created_at desc);
create index idx_payments_status_created on payments (status, created_at);

create table refunds (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references payments(id),
  amount numeric(15,2) not null,
  reason text not null,
  dispute_id uuid references disputes(id),
  provider_ref text,
  status text not null default 'pending',
  requested_by uuid references users(id),
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint refund_amount_positive check (amount > 0)
);

create index idx_refunds_payment on refunds (payment_id);
create index idx_refunds_dispute on refunds (dispute_id) where dispute_id is not null;

create table payout_batches (
  id uuid primary key default gen_random_uuid(),
  currency currency_code not null,
  scheduled_for date not null,
  total_gross numeric(15,2) not null,
  total_net numeric(15,2) not null,
  total_tax_withheld numeric(15,2) not null,
  total_penalties numeric(15,2) not null,
  payout_count int not null,
  status text not null default 'pending',
  provider text,
  created_by uuid not null references users(id),
  approved_by uuid references users(id),
  executed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_payout_batches_status on payout_batches (status, scheduled_for);

-- Avanti → driver
create table payouts (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid references engagements(id),
  substitution_id uuid references substitutions(id),
  driver_id uuid not null references driver_profiles(id),
  payout_method_id uuid not null references driver_payout_methods(id),
  currency currency_code not null,
  gross_payout numeric(15,2) not null,
  tax_withheld_total numeric(15,2) not null default 0,
  penalties_deducted numeric(15,2) not null default 0,
  net_amount numeric(15,2) not null,
  provider text,
  provider_ref text,
  batch_id uuid references payout_batches(id),
  status payout_status not null default 'pending',
  scheduled_for date,
  initiated_at timestamptz,
  completed_at timestamptz,
  failed_reason text,
  reversed_at timestamptz,
  reversed_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payout_amount_consistency
    check (net_amount = gross_payout - tax_withheld_total - penalties_deducted),
  constraint payout_has_context check (
    (engagement_id is not null) or (substitution_id is not null)
  )
);

create index idx_payouts_driver_status on payouts (driver_id, status, scheduled_for);
create index idx_payouts_engagement on payouts (engagement_id) where engagement_id is not null;
create index idx_payouts_substitution on payouts (substitution_id) where substitution_id is not null;
create index idx_payouts_batch on payouts (batch_id) where batch_id is not null;
create index idx_payouts_scheduled on payouts (scheduled_for, status) where status in ('pending', 'batched');
create index idx_payouts_ready_to_batch on payouts (currency, scheduled_for)
  where status = 'pending';
create unique index uniq_payout_provider_ref on payouts (provider, provider_ref)
  where provider_ref is not null;

-- Per-engagement (or per-substitution-interval) accounting entries
create table commission_entries (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references engagements(id),
  substitution_id uuid references substitutions(id),
  payment_id uuid references payments(id),
  currency currency_code not null,
  amount numeric(15,2) not null,
  rate numeric(6,5),
  created_at timestamptz not null default now()
);

create index idx_commission_engagement on commission_entries (engagement_id);
create index idx_commission_payment on commission_entries (payment_id) where payment_id is not null;

create table tax_entries (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid references engagements(id),
  payout_id uuid references payouts(id),
  payment_id uuid references payments(id),
  tax_rule_id uuid references tax_rules(id),
  tax_type tax_type not null,
  applies_to text not null,
  currency currency_code not null,
  taxable_base numeric(15,2) not null,
  rate numeric(6,5),
  amount numeric(15,2) not null,
  jurisdiction char(2) not null,
  remitted_at timestamptz,
  remittance_batch text,
  created_at timestamptz not null default now()
);

create index idx_tax_entries_engagement on tax_entries (engagement_id) where engagement_id is not null;
create index idx_tax_entries_payout on tax_entries (payout_id) where payout_id is not null;
create index idx_tax_entries_remittance on tax_entries (jurisdiction, tax_type, created_at)
  where remitted_at is null;

create table invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique,
  engagement_id uuid references engagements(id),
  customer_user_id uuid references users(id),
  customer_organization_id uuid references organizations(id),
  currency currency_code not null,
  subtotal numeric(15,2) not null,
  tax_total numeric(15,2) not null default 0,
  total numeric(15,2) not null,
  status text not null default 'issued',
  issued_at timestamptz not null default now(),
  due_date date,
  paid_at timestamptz,
  pdf_storage_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_invoices_customer_user on invoices (customer_user_id, issued_at desc);
create index idx_invoices_customer_org on invoices (customer_organization_id, issued_at desc);
create index idx_invoices_engagement on invoices (engagement_id);
create index idx_invoices_status on invoices (status);

create table invoice_lines (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  description text not null,
  quantity numeric(10,3) not null default 1,
  unit_amount numeric(15,2) not null,
  line_amount numeric(15,2) not null,
  tax_amount numeric(15,2) not null default 0,
  metadata jsonb not null default '{}'
);

create index idx_invoice_lines_invoice on invoice_lines (invoice_id);
