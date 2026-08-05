-- ============================================================================
-- Scrap withholding tax (WHT) on driver payouts.
--
-- Avanti does not withhold WHT from drivers; driver income tax is handled via
-- PAYE in accounting, outside the app. Drivers are therefore paid GROSS.
--
-- This recreates fn_build_payout_batch identical to 20260818000000 except the
-- WHT rate is 0, so tax_withheld = 0 and net_amount = gross_payout.
-- ============================================================================

begin;

create or replace function fn_build_payout_batch(
  p_actor_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_batch_id uuid;
  v_wht_rate numeric := 0.0;   -- WHT scrapped: drivers are paid gross
  v_gross numeric := 0;
  v_wht numeric := 0;
  v_net numeric := 0;
  v_count integer := 0;
  v_skipped integer := 0;
begin
  select count(*)
  into v_skipped
  from engagements e
  where e.status = 'completed'
    and e.driver_payout_total > 0
    and e.driver_id is not null
    and not exists (
      select 1 from payouts p
      where p.engagement_id = e.id
        and p.status::text not in ('failed', 'reversed')
    )
    and not exists (
      select 1 from driver_payout_methods dpm
      where dpm.driver_id = e.driver_id
        and dpm.deleted_at is null
    );

  insert into payout_batches (
    scheduled_for, currency, status, provider, created_by,
    total_gross, total_net, total_tax_withheld, total_penalties, payout_count
  )
  values (
    current_date, 'NGN', 'draft', 'manual', p_actor_user_id,
    0, 0, 0, 0, 0
  )
  returning id into v_batch_id;

  insert into payouts (
    batch_id, engagement_id, driver_id, payout_method_id, currency,
    gross_payout, tax_withheld_total, penalties_deducted, net_amount,
    provider, status, scheduled_for
  )
  select
    v_batch_id,
    e.id,
    e.driver_id,
    dpm.id,
    'NGN',
    e.driver_payout_total::numeric,
    round(e.driver_payout_total::numeric * v_wht_rate, 2),
    0,
    e.driver_payout_total::numeric
      - round(e.driver_payout_total::numeric * v_wht_rate, 2),
    'manual',
    'batched'::payout_status,
    current_date
  from engagements e
  join lateral (
    select id from driver_payout_methods
    where driver_id = e.driver_id
      and deleted_at is null
    order by is_default desc nulls last, created_at asc
    limit 1
  ) dpm on true
  where e.status = 'completed'
    and e.driver_payout_total > 0
    and e.driver_id is not null
    and not exists (
      select 1 from payouts p
      where p.engagement_id = e.id
        and p.status::text not in ('failed', 'reversed')
    );

  select
    coalesce(sum(gross_payout), 0),
    coalesce(sum(tax_withheld_total), 0),
    coalesce(sum(net_amount), 0),
    count(*)
  into v_gross, v_wht, v_net, v_count
  from payouts
  where batch_id = v_batch_id;

  update payout_batches
  set
    total_gross = v_gross,
    total_tax_withheld = v_wht,
    total_net = v_net,
    payout_count = v_count,
    updated_at = now()
  where id = v_batch_id;

  insert into audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
  values (
    p_actor_user_id,
    'create',
    'payout_batch',
    v_batch_id,
    jsonb_build_object(
      'payout_count', v_count,
      'total_gross', v_gross,
      'skipped_count', v_skipped,
      'skipped_reason', case when v_skipped > 0 then 'missing_payout_method' else null end
    )
  );

  return jsonb_build_object(
    'batch_id', v_batch_id,
    'payout_count', v_count,
    'total_gross', v_gross,
    'total_net', v_net,
    'skipped_count', v_skipped,
    'skipped_reason', case when v_skipped > 0 then 'missing_payout_method' else null end
  );
end;
$$;

commit;
