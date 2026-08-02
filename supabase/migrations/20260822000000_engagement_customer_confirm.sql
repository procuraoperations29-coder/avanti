-- ============================================================================
-- Customer-side completion confirmation.
--
-- The driver marks an engagement 'completed'; the customer then confirms on
-- their end so Avanti knows the job is genuinely done. This records that
-- acknowledgement (it does not change the engagement status — 'completed' is
-- still set by the driver).
-- ============================================================================

alter table engagements
  add column if not exists customer_confirmed_at timestamptz;
