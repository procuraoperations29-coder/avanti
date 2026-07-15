-- Slice 8 (fix): Correct enum values and payout_method_id lookup
--
-- Fixes:
--   1. payouts.status uses enum with values: batched, initiated, completed, etc.
--      Draft-batch items should be 'batched'; released items go to 'completed'.
--   2. payouts.payout_method_id is NOT NULL. Look up each driver's default
--      payout method via LATERAL JOIN. Drivers without a method are silently
--      skipped (they'd fail the transfer anyway).
--
-- Replaces the two functions from 20260814000000. Idempotent (CREATE OR REPLACE).

begin;

create or replace function fn_build_payout_batch(
  p_actor_user_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_batch_id uuid;
  v_wht_rate numeric := 0.050;
  v_gross numeric := 0;
  v_wht numeric := 0;
  v_net numeric := 0;
  v_count integer := 0;
  v_skipped integer := 0;
  v_eligible_count integer := 0;
begin
  -- Count eligible drivers without payout methods (for audit note)
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

  -- Count total eligible before payout method filter
  select count(*)
  into v_eligible_count
  from engagements e
  where e.status = 'completed'
    and e.driver_payout_total > 0
    and e.driver_id is not null
    and not exists (
      select 1 from payouts p
      where p.engagement_id = e.id
        and p.status::text not in ('failed', 'reversed')
    );

  -- Create draft batch
  insert into payout_batches (
    scheduled_for, currency, status, provider, created_by,
    total_gross, total_net, total_tax_withheld, total_penalties, payout_count
  )
  values (
    current_date, 'NGN', 'draft', 'manual', p_actor_user_id,
    0, 0, 0, 0, 0
  )
  returning id into v_batch_id;

  -- Create payouts for eligible engagements WITH a payout method.
  -- LATERAL JOIN picks the driver's default (or oldest) verified method.
  -- Drivers without a method are silently dropped from the batch.
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

  -- Roll up totals
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

  -- Audit trail — includes skipped count if any
  insert into audit_logs (actor_user_id, action, target_type, target_id, rationale)
  values (
    p_actor_user_id,
    'payout_batch.created',
    'payout_batch',
    v_batch_id,
    case
      when v_skipped > 0 then
        format(
          'Created batch with %s payouts (gross %s). Skipped %s engagement(s) because their driver has no verified payout method.',
          v_count, v_gross, v_skipped
        )
      else
        format('Created batch with %s payouts, total gross %s', v_count, v_gross)
    end
  );

  return v_batch_id;
end;
$$;

create or replace function fn_release_payout_batch(
  p_batch_id uuid,
  p_actor_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
begin
  select status into v_status from payout_batches where id = p_batch_id;

  if v_status is null then
    raise exception 'batch_not_found';
  end if;

  if v_status not in ('draft', 'approved') then
    raise exception 'invalid_status: batch is %', v_status;
  end if;

  -- Flip batched items to completed
  update payouts
  set
    status = 'completed'::payout_status,
    completed_at = now(),
    updated_at = now()
  where batch_id = p_batch_id
    and status::text = 'batched';

  -- Mark batch as completed
  update payout_batches
  set
    status = 'completed',
    approved_by = p_actor_user_id,
    executed_at = now(),
    updated_at = now()
  where id = p_batch_id;

  -- Audit trail
  insert into audit_logs (actor_user_id, action, target_type, target_id, rationale)
  values (
    p_actor_user_id,
    'payout_batch.released',
    'payout_batch',
    p_batch_id,
    'Batch released; all batched payouts marked completed'
  );
end;
$$;

commit;
