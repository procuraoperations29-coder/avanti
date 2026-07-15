-- Slice 8 (adapted): Payout batch functions
--
-- Slice 2 already defined:
--   payout_batches (scheduled_for, total_gross, total_net, total_tax_withheld,
--     total_penalties, payout_count, status text, provider, created_by, approved_by,
--     executed_at, currency)
--   payouts (engagement_id, substitution_id, driver_id, payout_method_id,
--     gross_payout, tax_withheld_total, penalties_deducted, net_amount,
--     provider, status enum, batch_id, scheduled_for, initiated_at, completed_at,
--     failed_reason, reversed_at)
--
-- This migration adds only:
--   * RLS policies (idempotent)
--   * fn_build_payout_batch  — assembles unpaid completed engagements into a batch
--   * fn_release_payout_batch — flips batch status to completed, marks payouts completed
--
-- If your payouts.status enum uses different labels than 'pending'/'completed',
-- edit the two assignments in the functions below to match. Check with:
--   select t.typname, e.enumlabel from pg_type t
--   join pg_enum e on t.oid = e.enumtypid where t.typname ilike '%payout%';

begin;

-- ─────────────── RLS ───────────────

alter table payout_batches enable row level security;
alter table payouts enable row level security;

drop policy if exists payout_batches_admin_read on payout_batches;
create policy payout_batches_admin_read on payout_batches
  for select using (
    exists (
      select 1 from user_roles
      where user_id = auth.uid() and role in ('admin_finance', 'super_admin')
    )
  );

drop policy if exists payout_batches_admin_write on payout_batches;
create policy payout_batches_admin_write on payout_batches
  for all using (
    exists (
      select 1 from user_roles
      where user_id = auth.uid() and role in ('admin_finance', 'super_admin')
    )
  );

drop policy if exists payouts_read on payouts;
create policy payouts_read on payouts
  for select using (
    driver_id in (select id from driver_profiles where user_id = auth.uid())
    or exists (
      select 1 from user_roles
      where user_id = auth.uid() and role in ('admin_finance', 'super_admin')
    )
  );

drop policy if exists payouts_admin_write on payouts;
create policy payouts_admin_write on payouts
  for all using (
    exists (
      select 1 from user_roles
      where user_id = auth.uid() and role in ('admin_finance', 'super_admin')
    )
  );

-- ─────────────── Functions ───────────────

-- Build a draft batch containing all completed engagements without an
-- active payout row. Applies 5% WHT. Adapts to the real payouts schema.
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
begin
  -- Create draft batch (with zero totals; we'll roll up after items)
  insert into payout_batches (
    scheduled_for, currency, status, provider, created_by,
    total_gross, total_net, total_tax_withheld, total_penalties, payout_count
  )
  values (
    current_date, 'NGN', 'draft', 'manual', p_actor_user_id,
    0, 0, 0, 0, 0
  )
  returning id into v_batch_id;

  -- Create payout rows for each eligible engagement.
  -- Eligible = status='completed', payout > 0, not already in a
  -- non-failed/non-reversed payout row.
  insert into payouts (
    batch_id, engagement_id, driver_id, currency,
    gross_payout, tax_withheld_total, penalties_deducted, net_amount,
    provider, status, scheduled_for
  )
  select
    v_batch_id,
    e.id,
    e.driver_id,
    'NGN',
    e.driver_payout_total::numeric,
    round(e.driver_payout_total::numeric * v_wht_rate, 2),
    0,
    e.driver_payout_total::numeric
      - round(e.driver_payout_total::numeric * v_wht_rate, 2),
    'manual',
    'pending',
    current_date
  from engagements e
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

  -- Audit trail
  insert into audit_logs (actor_user_id, action, target_type, target_id, rationale)
  values (
    p_actor_user_id,
    'payout_batch.created',
    'payout_batch',
    v_batch_id,
    format('Created batch with %s payouts, total gross %s', v_count, v_gross)
  );

  return v_batch_id;
end;
$$;

-- Release a batch: mark all pending payouts as completed, batch as completed.
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

  -- Mark all pending payouts as completed
  update payouts
  set
    status = 'completed',
    completed_at = now(),
    updated_at = now()
  where batch_id = p_batch_id
    and status::text = 'pending';

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
    'Batch released; all pending payouts marked completed'
  );
end;
$$;

commit;
