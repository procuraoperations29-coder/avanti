-- ============================================================================
-- Projection views (Phase 3 §23)
--
-- These are the code-level enforcement of information isolation. RLS handles
-- row-level access; the *projection* (which columns are visible) is done here.
--
-- Rule: a customer view never selects driver_payout, commission, or tax
-- withheld. A driver view never selects customer_price total or commission.
-- ============================================================================

-- Customer's view of an engagement — no payout, no commission, no tax withheld
create view v_engagements_customer as
select
  e.id,
  e.customer_user_id,
  e.customer_organization_id,
  e.driver_id,
  dp.user_id as driver_user_id,
  u.full_name as driver_name,
  dp.verification_tier as driver_verification_tier,
  dp.average_rating as driver_rating,
  e.engagement_type,
  e.status,
  e.starts_at,
  e.ends_at,
  e.expected_daily_hours,
  e.timezone,
  e.vehicle_id,
  e.pickup_address,
  e.pickup_location,
  e.special_instructions,
  e.min_verification_tier,
  e.auto_substitute_policy,
  e.currency,
  e.customer_price_total,        -- customer sees TOTAL
  -- deliberately NOT selected: driver_payout_total, commission_total
  e.price_quote_id,
  e.contract_id,
  e.cost_centre_id,
  e.requested_at,
  e.confirmed_at,
  e.activated_at,
  e.completed_at,
  e.cancelled_at,
  e.created_at,
  e.updated_at
from engagements e
left join driver_profiles dp on dp.id = e.driver_id
left join users u on u.id = dp.user_id
where e.deleted_at is null;

-- Driver's view — no customer price, no commission
create view v_engagements_driver as
select
  e.id,
  e.driver_id,
  e.customer_user_id,           -- driver sees customer's user_id (to display them)
  e.customer_organization_id,
  cu.full_name as customer_name,
  e.engagement_type,
  e.status,
  e.starts_at,
  e.ends_at,
  e.expected_daily_hours,
  e.timezone,
  e.vehicle_id,
  e.pickup_address,
  e.pickup_location,
  e.special_instructions,
  e.min_verification_tier,
  e.currency,
  e.driver_payout_total,         -- driver sees PAYOUT
  -- deliberately NOT selected: customer_price_total, commission_total
  e.contract_id,
  e.requested_at,
  e.accepted_at,
  e.confirmed_at,
  e.activated_at,
  e.completed_at,
  e.cancelled_at,
  e.created_at,
  e.updated_at
from engagements e
left join users cu on cu.id = e.customer_user_id
where e.deleted_at is null;

-- Public driver summary — search results, driver profile page
create view v_public_driver_summary as
select
  dp.id as driver_id,
  dp.user_id,
  u.full_name,
  dp.bio,
  dp.years_experience,
  dp.languages,
  dp.vehicle_class_experience,
  dp.transmission_experience,
  dp.home_base_location,
  dp.service_radius_km,
  dp.verification_tier,
  dp.average_rating,
  dp.total_ratings,
  dp.completed_jobs,
  dp.accepts_engagement_types
from driver_profiles dp
join users u on u.id = dp.user_id
where dp.verification_tier in ('t2','t3','t4')
  and not dp.suspended
  and dp.deleted_at is null;

-- Driver's monthly earnings — payouts + tax withheld from their side only
create view v_driver_earnings_monthly as
select
  dp.id as driver_id,
  dp.user_id,
  date_trunc('month', po.completed_at)::date as month,
  po.currency,
  count(*) as payouts_count,
  sum(po.gross_payout) as gross_total,
  sum(po.tax_withheld_total) as tax_withheld_total,
  sum(po.penalties_deducted) as penalties_deducted_total,
  sum(po.net_amount) as net_total
from driver_profiles dp
join payouts po on po.driver_id = dp.id
where po.status = 'completed' and po.completed_at is not null
group by dp.id, dp.user_id, date_trunc('month', po.completed_at), po.currency;

-- Admin reconciliation view — full picture including both sides
create view v_engagement_reconciliation as
select
  e.id as engagement_id,
  e.status,
  e.currency,
  e.customer_price_total,
  e.driver_payout_total,
  e.commission_total,
  coalesce(pay_agg.captured_total, 0) as captured_total,
  coalesce(pay_agg.refunded_total, 0) as refunded_total,
  coalesce(po_agg.completed_total, 0) as payout_completed_total,
  coalesce(ce_agg.commission_recognised, 0) as commission_recognised,
  coalesce(te_agg.tax_recognised, 0) as tax_recognised,
  case
    when e.status in ('cancelled','refunded') then true
    when coalesce(pay_agg.captured_total, 0) = e.customer_price_total
      and coalesce(po_agg.completed_total, 0) = e.driver_payout_total
      then true
    else false
  end as fully_reconciled,
  e.completed_at,
  e.updated_at
from engagements e
left join (
  select engagement_id,
         sum(case when status = 'captured' then gross_amount else 0 end) as captured_total,
         sum(refunded_amount) as refunded_total
    from payments
   group by engagement_id
) pay_agg on pay_agg.engagement_id = e.id
left join (
  select engagement_id,
         sum(case when status = 'completed' then net_amount else 0 end) as completed_total
    from payouts
   where engagement_id is not null
   group by engagement_id
) po_agg on po_agg.engagement_id = e.id
left join (
  select engagement_id, sum(amount) as commission_recognised
    from commission_entries group by engagement_id
) ce_agg on ce_agg.engagement_id = e.id
left join (
  select engagement_id, sum(amount) as tax_recognised
    from tax_entries where engagement_id is not null
   group by engagement_id
) te_agg on te_agg.engagement_id = e.id;

-- Admin verification queue — the review workload
create view v_verification_queue as
select
  dp.id as driver_id,
  dp.user_id,
  u.full_name,
  u.phone,
  u.country_code,
  dp.verification_tier,
  dp.verification_status,
  (
    select ve.created_at
      from verification_events ve
     where ve.driver_id = dp.id and ve.event_type = 'submitted'
     order by ve.created_at desc limit 1
  ) as submitted_at,
  (
    select count(*) from documents d
     where d.owner_user_id = dp.user_id and d.is_active
  ) as active_document_count,
  now() - coalesce((
    select ve.created_at from verification_events ve
     where ve.driver_id = dp.id and ve.event_type = 'submitted'
     order by ve.created_at desc limit 1
  ), dp.created_at) as time_waiting
from driver_profiles dp
join users u on u.id = dp.user_id
where dp.verification_status in ('submitted', 'under_review', 'more_info_needed')
  and dp.deleted_at is null;
