-- ============================================================================
-- Pricing settings — one editable home for the levers that were hardcoded
-- across the codebase (VAT, commissions, placement fee/upfront, tier salaries).
--
-- Single-row table (id = 1). Server money paths read it via getPricingSettings()
-- and fall back to these defaults (the previous constants) if the row is absent.
-- ============================================================================

begin;

create table if not exists pricing_settings (
  id int primary key default 1 check (id = 1),
  currency text not null default 'NGN',

  -- Tax
  vat_rate numeric(6,4) not null default 0.0750,          -- 7.5% VAT, added on top

  -- On-demand: commission Avanti keeps, by driver tier (used as the editor
  -- default when setting a rate; driver payout is stored per price_rule).
  ondemand_commission_by_tier jsonb not null default '{"t1":0.20,"t2":0.20,"t3":0.20,"t4":0.20}'::jsonb,

  -- Permanent placement
  tier_monthly_salary jsonb not null default '{"t1":150000,"t2":175000,"t3":225000,"t4":325000}'::jsonb,
  placement_commission_rate numeric(6,4) not null default 0.1500,   -- Avanti keeps 15% of salary
  placement_fee_rate numeric(6,4) not null default 0.7000,          -- one-off fee = 70% of a month
  placement_upfront_rate numeric(6,4) not null default 0.7000,

  -- Corporate staffing
  corporate_upfront_rate numeric(6,4) not null default 0.7000,

  updated_at timestamptz not null default now(),
  updated_by uuid references users(id)
);

insert into pricing_settings (id) values (1) on conflict (id) do nothing;

alter table pricing_settings enable row level security;

drop policy if exists pricing_settings_admin_all on pricing_settings;
create policy pricing_settings_admin_all on pricing_settings
  for all using (auth_role_has('admin_finance') or auth_role_has('super_admin'))
  with check (auth_role_has('admin_finance') or auth_role_has('super_admin'));

commit;
