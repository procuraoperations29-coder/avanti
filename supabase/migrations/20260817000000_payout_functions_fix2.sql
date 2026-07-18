-- Slice 8 (fix 3): Report skipped engagements back to the caller, fix the
-- audit_logs schema mismatch, and guard against releasing an empty batch.
--
-- Diagnosis (2026-07-17): admin created a batch with 1 completed engagement
-- worth ₦86,400 showing under "Ready to batch", but the batch came back
-- with payout_count = 0.
--
-- Root cause: 20260816000000_payout_functions_noaudit.sql requires each
-- driver to have a row in driver_payout_methods (payouts.payout_method_id
-- is NOT NULL) and silently drops any engagement whose driver doesn't have
-- one — with zero indication to the admin that anything was skipped.
-- The 20260815000000 version at least tried to log the skip count, but to
-- audit_logs columns that don't exist (target_type/target_id/rationale —
-- the real columns are entity_type/entity_id/metadata), so that insert
-- would have failed outright; 20260816000000 just removed it.
--
-- This migration:
--   1. Changes fn_build_payout_batch's return type from uuid to jsonb, so
--      the API route (and the admin) can see *why* a batch came back short.
--   2. Writes a correct audit_logs row this time.
--   3. Makes fn_release_payout_batch refuse to release a batch with
--      payout_count = 0 — which is how the existing batch ended up shown
--      as "completed" with nothing in it.
--
-- Note: the ₦86,400 engagement from the original bug report was never
-- inserted into `payouts` (it was silently skipped), so it's not lost —
-- it will still show up under "Ready to batch" and will be picked up
-- correctly once that driver has a payout method on file. Check with:
--   select driver_id from driver_payout_methods where driver_id = '<id>' and deleted_at is null;

begin;

drop function if exists fn_build_payout_batch(uuid);

create function fn_build_payout_batch(
  p_actor_user_id uuid
)
returns jsonb
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
begin
  -- Engagements that are otherwise eligible but whose driver has no
  -- verified payout method on file. These get excluded from the insert
  -- below (payout_method_id is NOT NULL); we count them here so the
  -- caller can tell the admin why the batch might be short.
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
    v_batch_id::text,
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
  v_payout_count integer;
begin
  select status, payout_count into v_status, v_payout_count
  from payout_batches where id = p_batch_id;

  if v_status is null then
    raise exception 'batch_not_found';
  end if;

  if v_status not in ('draft', 'approved') then
    raise exception 'invalid_status: batch is %', v_status;
  end if;

  if v_payout_count = 0 then
    raise exception 'empty_batch: this batch has no payouts to release';
  end if;

  update payouts
  set
    status = 'completed'::payout_status,
    completed_at = now(),
    updated_at = now()
  where batch_id = p_batch_id
    and status::text = 'batched';

  update payout_batches
  set
    status = 'completed',
    approved_by = p_actor_user_id,
    executed_at = now(),
    updated_at = now()
  where id = p_batch_id;

  insert into audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
  values (
    p_actor_user_id,
    'complete_payout',
    'payout_batch',
    p_batch_id::text,
    jsonb_build_object('payout_count', v_payout_count)
  );
end;
$$;

commit;
