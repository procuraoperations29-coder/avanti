-- ============================================================================
-- Corporate driver payouts — what Avanti pays each driver for a month.
--
-- Generated alongside the monthly org invoice, from the same attendance:
--   base    = min(present_days, 22) x (driver_monthly_pay / 22)   [Mon-Fri, capped]
--   overtime = approved overtime hours x overtime_hourly_rate      [pass-through]
--
-- Private to the driver + Avanti (the org never sees driver pay). Separate from
-- the weekly on-demand payout batch.
-- ============================================================================

begin;

create table if not exists corporate_payouts (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references corporate_assignments(id) on delete cascade,
  driver_id uuid not null references driver_profiles(id),
  organization_id uuid not null references organizations(id) on delete cascade,
  period_month date not null,
  present_days int not null default 0,
  base_amount numeric(12,2) not null default 0,
  overtime_hours numeric(6,2) not null default 0,
  overtime_amount numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  currency text not null default 'NGN',
  status text not null default 'pending' check (status in ('pending', 'paid')),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uniq_corp_payout_per_period unique (assignment_id, period_month)
);
create index if not exists idx_corp_payouts_status on corporate_payouts(status, period_month);
create index if not exists idx_corp_payouts_driver on corporate_payouts(driver_id, period_month desc);

alter table corporate_payouts enable row level security;

-- Driver reads their own; admin manages all. (No org policy — org never sees pay.)
drop policy if exists corp_payouts_driver_read on corporate_payouts;
create policy corp_payouts_driver_read on corporate_payouts
  for select using (
    exists (select 1 from driver_profiles dp where dp.id = corporate_payouts.driver_id and dp.user_id = auth.uid())
  );
drop policy if exists corp_payouts_admin_all on corporate_payouts;
create policy corp_payouts_admin_all on corporate_payouts
  for all using (
    exists (select 1 from user_roles where user_id = auth.uid()
      and role in ('admin_finance', 'admin_support', 'super_admin'))
  );

commit;
