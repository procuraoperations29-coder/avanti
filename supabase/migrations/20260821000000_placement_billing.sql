-- ============================================================================
-- Permanent placement billing.
--
-- Placements are monthly-salaried and billed to the CUSTOMER (who pays Avanti;
-- Avanti pays the driver separately). This is deliberately NOT the weekly
-- on-demand payout batch flow.
--
-- Model (adjustable):
--   * Upfront: 70% of one month's salary, due before the placement activates.
--     The placement stays 'pending' until this is paid, then goes 'active'.
--   * Monthly: the full salary, invoiced on the billing day each month, with a
--     reminder sent 2 days before the due date. Customer pays Avanti.
--
-- Each invoice is its own row (upfront or monthly) keyed by period, so a daily
-- scheduler can generate/remind idempotently.
-- ============================================================================

begin;

-- Day-of-month the salary is due. Derived from start_date at creation, capped
-- at 28 so it exists in every month.
alter table placements
  add column if not exists billing_day int
    check (billing_day is null or (billing_day >= 1 and billing_day <= 28));

create table if not exists placement_invoices (
  id uuid primary key default gen_random_uuid(),
  placement_id uuid not null references placements(id) on delete cascade,
  customer_user_id uuid not null references public.users(id),

  kind text not null check (kind in ('upfront', 'monthly')),
  -- First day of the month this invoice covers. Null for the upfront deposit.
  period_month date,
  amount numeric(12,2) not null check (amount >= 0),
  currency text not null default 'NGN',
  due_date date not null,

  status text not null default 'pending'
    check (status in ('pending', 'paid', 'overdue', 'cancelled')),
  payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'paid', 'manual_paid')),
  payment_reference text,
  payment_link text,

  invoice_sent_at timestamptz,
  reminder_sent_at timestamptz,
  paid_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- One invoice per placement per kind per period (upfront has null period, so
  -- a partial unique index covers the monthly case).
  constraint uniq_placement_invoice_upfront unique (placement_id, kind, period_month)
);

create index if not exists idx_placement_invoices_placement on placement_invoices(placement_id);
create index if not exists idx_placement_invoices_customer on placement_invoices(customer_user_id);
create index if not exists idx_placement_invoices_status on placement_invoices(status, due_date);
create unique index if not exists uniq_placement_invoices_payref
  on placement_invoices(payment_reference) where payment_reference is not null;

alter table placement_invoices enable row level security;

drop policy if exists placement_invoices_customer_read on placement_invoices;
create policy placement_invoices_customer_read on placement_invoices
  for select using (customer_user_id = auth.uid());

drop policy if exists placement_invoices_admin_all on placement_invoices;
create policy placement_invoices_admin_all on placement_invoices
  for all using (
    exists (
      select 1 from user_roles
      where user_id = auth.uid()
        and role in ('admin_support', 'admin_verifier', 'admin_finance', 'super_admin')
    )
  );

commit;
