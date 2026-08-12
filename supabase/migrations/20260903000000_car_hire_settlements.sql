-- ============================================================================
-- Car hire — settlement tracking.
--
-- Once a customer pays for a car hire, Avanti owes two external parties:
--   • the leasing partner  → partner_cost_total
--   • the assigned driver  → driver_pay_total
-- Car-hire driver pay is NOT part of the engagement-based payout batches
-- (fn_build_payout_batch reads `engagements`), so both are settled out-of-band
-- and tracked here per booking.
-- ============================================================================

begin;

alter table car_hire_bookings
  add column if not exists partner_settlement_status text not null default 'unsettled'
    check (partner_settlement_status in ('unsettled', 'settled')),
  add column if not exists partner_settled_at timestamptz,
  add column if not exists partner_settlement_ref text,
  add column if not exists driver_settlement_status text not null default 'unsettled'
    check (driver_settlement_status in ('unsettled', 'settled')),
  add column if not exists driver_settled_at timestamptz,
  add column if not exists driver_settlement_ref text;

-- Fast lookup of what's still owed on paid bookings.
create index if not exists idx_car_hire_partner_owed
  on car_hire_bookings (partner_id)
  where payment_status in ('paid', 'manual_paid') and partner_settlement_status = 'unsettled' and deleted_at is null;

create index if not exists idx_car_hire_driver_owed
  on car_hire_bookings (assigned_driver_id)
  where payment_status in ('paid', 'manual_paid') and driver_settlement_status = 'unsettled' and deleted_at is null;

commit;
