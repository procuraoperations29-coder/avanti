-- ============================================================================
-- Corporate staffing rework: monthly (not daily) + 70% upfront + invoices.
--
--   monthly_rate       — what the ORG pays Avanti per driver per month (the one
--                        figure the org sees)
--   driver_monthly_pay — what Avanti pays the driver (internal; margin = gap)
--
-- An assignment now starts 'pending' and only activates when the 70% upfront
-- invoice is paid (mirrors permanent placements). Attendance-based monthly
-- invoicing arrives with Phase 2.
-- ============================================================================

begin;

-- ── Assignments: daily -> monthly ──
alter table corporate_assignments drop constraint if exists corp_assignment_pay_lte_rate;
alter table corporate_assignments drop column if exists daily_rate;
alter table corporate_assignments drop column if exists driver_daily_pay;

alter table corporate_assignments
  add column if not exists monthly_rate numeric(12,2) not null default 0 check (monthly_rate >= 0),
  add column if not exists driver_monthly_pay numeric(12,2) not null default 0 check (driver_monthly_pay >= 0),
  add column if not exists activated_at timestamptz;

alter table corporate_assignments
  add constraint corp_assignment_pay_lte_rate check (driver_monthly_pay <= monthly_rate);

-- Assignments wait for the upfront payment before going active.
alter table corporate_assignments drop constraint if exists corporate_assignments_status_check;
alter table corporate_assignments
  add constraint corporate_assignments_status_check check (status in ('pending', 'active', 'ended', 'replaced'));
alter table corporate_assignments alter column status set default 'pending';

-- ── Corporate invoices (upfront now; monthly aggregate later) ──
create table if not exists corporate_invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  assignment_id uuid references corporate_assignments(id),  -- set for 'upfront'; null for monthly aggregate
  kind text not null check (kind in ('upfront', 'monthly')),
  period_month date,
  amount numeric(12,2) not null check (amount >= 0),
  currency text not null default 'NGN',
  due_date date not null,
  line_items jsonb not null default '[]',

  status text not null default 'pending' check (status in ('pending', 'paid', 'overdue', 'cancelled')),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid', 'paid', 'manual_paid')),
  payment_reference text,
  payment_link text,
  invoice_sent_at timestamptz,
  paid_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_corp_invoices_org on corporate_invoices(organization_id, status);
create index if not exists idx_corp_invoices_assignment on corporate_invoices(assignment_id);
create unique index if not exists uniq_corp_invoices_payref
  on corporate_invoices(payment_reference) where payment_reference is not null;

alter table corporate_invoices enable row level security;

drop policy if exists corp_invoices_member_read on corporate_invoices;
create policy corp_invoices_member_read on corporate_invoices
  for select using (
    exists (
      select 1 from user_roles ur
      where ur.user_id = auth.uid() and ur.organization_id = corporate_invoices.organization_id
        and ur.role in ('corporate_admin', 'corporate_member') and ur.revoked_at is null
    )
  );
drop policy if exists corp_invoices_admin_all on corporate_invoices;
create policy corp_invoices_admin_all on corporate_invoices
  for all using (
    exists (select 1 from user_roles where user_id = auth.uid()
      and role in ('admin_support','admin_verifier','admin_finance','super_admin'))
  );

commit;
