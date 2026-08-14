-- ============================================================================
-- On-demand engagement cancellation + refund accounting.
--
-- Records the cancellation fee and refund on the engagement, and adds the
-- cancellation policy (editable) to pricing_settings. The refunds table,
-- payments.refunded_* columns, and engagements.cancelled_* already exist.
-- ============================================================================

begin;

alter table engagements
  add column if not exists cancellation_fee numeric(15,2),
  add column if not exists refund_amount numeric(15,2),
  add column if not exists refunded_at timestamptz,
  add column if not exists refund_id uuid references refunds(id);

-- Editable cancellation policy (fractions of amount paid), by notice before start.
alter table pricing_settings
  add column if not exists cancel_free_hours numeric not null default 72,   -- >= this many hours notice: free
  add column if not exists cancel_near_hours numeric not null default 24,   -- < this many hours: the "near" (highest) fee
  add column if not exists cancel_fee_near numeric(6,4) not null default 0.1000,  -- fee inside cancel_near_hours
  add column if not exists cancel_fee_mid numeric(6,4) not null default 0.0500;   -- fee between near and free

commit;
