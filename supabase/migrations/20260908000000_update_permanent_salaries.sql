-- ============================================================================
-- Update permanent-placement monthly salaries by tier (reviewed pricing):
--   T1 120,000 · T2 150,000 · T3 175,000 · T4 200,000
-- Applies to the live pricing_settings row; new placements use these.
-- (Still editable in Admin → Pricing.)
-- ============================================================================

begin;

update pricing_settings
set tier_monthly_salary = '{"t1":120000,"t2":150000,"t3":175000,"t4":200000}'::jsonb,
    updated_at = now()
where id = 1;

commit;
