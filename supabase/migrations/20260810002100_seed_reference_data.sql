-- ============================================================================
-- Seed reference data
--
-- Idempotent — safe to re-run. Uses `on conflict do nothing`.
-- This is DEV seed only; production seed goes through a proper admin flow.
-- ============================================================================

-- A placeholder system user we can attribute seed-created rows to. Skipped
-- in production; only inserted if the auth.users row exists (created by
-- the setup script separately).
do $$
declare
  system_user_id constant uuid := '00000000-0000-0000-0000-000000000001';
begin
  if exists (select 1 from auth.users where id = system_user_id) then
    insert into users (id, email, full_name, country_code, active_role, status)
    values (system_user_id, 'system@avanti.local', 'System', 'NG', 'super_admin', 'active')
    on conflict (id) do nothing;

    insert into user_roles (user_id, role)
    values (system_user_id, 'super_admin')
    on conflict do nothing;
  end if;
end $$;

-- Sample Nigeria rate card — matches the prototype numbers.
-- Only inserted if a system user exists to attribute it to.
do $$
declare
  system_user_id constant uuid := '00000000-0000-0000-0000-000000000001';
  card_id uuid;
begin
  if not exists (select 1 from users where id = system_user_id) then
    return;
  end if;
  if exists (select 1 from rate_cards where country_code = 'NG' and version = 1) then
    return;
  end if;

  insert into rate_cards (id, name, country_code, currency, version, status, effective_from, created_by)
  values (gen_random_uuid(), 'Nigeria — v1 (seed)', 'NG', 'NGN', 1, 'draft', null, system_user_id)
  returning id into card_id;

  insert into price_rules (rate_card_id, engagement_type, min_verification_tier, vehicle_class, time_band, day_type, unit,
                           base_customer_price, base_driver_payout, overtime_multiplier, overtime_threshold_hours, minimum_charge)
  values
    (card_id, 'hourly',   't2', 'sedan',     'day', 'weekday', 'hour', 3800, 3040, 1.25, 4, 7600),
    (card_id, 'hourly',   't3', 'sedan',     'day', 'weekday', 'hour', 4500, 3600, 1.25, 4, 9000),
    (card_id, 'hourly',   't3', 'suv',       'day', 'weekday', 'hour', 4800, 3840, 1.25, 4, 9600),
    (card_id, 'hourly',   't3', 'executive', 'day', 'weekday', 'hour', 5500, 4400, 1.25, 4, 11000),
    (card_id, 'hourly',   't4', 'executive', 'day', 'weekday', 'hour', 6500, 5200, 1.25, 4, 13000),
    (card_id, 'full_day', 't2', 'sedan',     'day', 'weekday', 'day', 30400, 24320, 1.25, 8, 30400),
    (card_id, 'full_day', 't3', 'sedan',     'day', 'weekday', 'day', 36000, 28800, 1.25, 8, 36000),
    (card_id, 'full_day', 't3', 'suv',       'day', 'weekday', 'day', 38400, 30720, 1.25, 8, 38400),
    (card_id, 'full_day', 't3', 'executive', 'day', 'weekday', 'day', 44000, 35200, 1.25, 8, 44000),
    (card_id, 'full_day', 't4', 'executive', 'day', 'weekday', 'day', 52000, 41600, 1.25, 8, 52000)
  on conflict do nothing;
end $$;

-- Sample Nigeria tax rules — 5% withholding on driver payout, 7.5% VAT on
-- Avanti's commission. Effective 1 Jan 2026.
do $$
declare
  system_user_id constant uuid := '00000000-0000-0000-0000-000000000001';
begin
  if not exists (select 1 from users where id = system_user_id) then
    return;
  end if;

  insert into tax_rules (country_code, currency, tax_type, applies_to, rate, effective_from,
                         authority_name, remittance_frequency, status, created_by)
  values
    ('NG', 'NGN', 'wht', 'driver_payout',      0.05000, '2026-01-01', 'FIRS', 'monthly', 'published', system_user_id),
    ('NG', 'NGN', 'vat', 'avanti_commission',  0.07500, '2026-01-01', 'FIRS', 'monthly', 'published', system_user_id)
  on conflict do nothing;
end $$;
