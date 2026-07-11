-- ============================================================================
-- Functions & triggers — invariant enforcement
--
-- Every function is SECURITY INVOKER unless bypass is required. Where a
-- function must run with elevated privilege (e.g. reading a private table
-- to set a claim), it's marked SECURITY DEFINER and validated with an
-- explicit ownership/permission check inside the body.
-- ============================================================================

-- ---- helper: updated_at bumper -------------------------------------------

create or replace function fn_touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Apply to every table that has updated_at
do $$
declare r record;
begin
  for r in
    select c.table_schema, c.table_name
    from information_schema.columns c
    join information_schema.tables t
      on t.table_schema = c.table_schema and t.table_name = c.table_name
    where c.column_name = 'updated_at'
      and c.table_schema = 'public'
      and t.table_type = 'BASE TABLE'
  loop
    execute format(
      'create trigger trg_%I_touch_updated_at before update on %I.%I for each row execute function fn_touch_updated_at();',
      r.table_name, r.table_schema, r.table_name
    );
  end loop;
end $$;

-- ---- engagement status transitions get logged automatically ---------------

create or replace function fn_log_engagement_status() returns trigger
language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    insert into engagement_status_transitions
      (engagement_id, from_status, to_status, occurred_at)
    values (new.id, null, new.status, now());
  elsif new.status is distinct from old.status then
    insert into engagement_status_transitions
      (engagement_id, from_status, to_status, occurred_at)
    values (new.id, old.status, new.status, now());
  end if;
  return new;
end;
$$;

create trigger trg_engagements_log_status
  after insert or update of status on engagements
  for each row execute function fn_log_engagement_status();

-- ---- price_quotes immutable after write -----------------------------------

create or replace function fn_price_quote_immutable() returns trigger
language plpgsql as $$
begin
  -- Allow only consumed_at to be set (nullable → timestamp), once.
  if old.consumed_at is not null and new.consumed_at is distinct from old.consumed_at then
    raise exception 'price_quotes.consumed_at is already set';
  end if;
  if row(new.*) is distinct from row(old.*) and
     new.consumed_at is not distinct from old.consumed_at then
    raise exception 'price_quotes rows are immutable after write';
  end if;
  return new;
end;
$$;

create trigger trg_price_quotes_immutable
  before update on price_quotes
  for each row execute function fn_price_quote_immutable();

-- ---- verification_events append-only --------------------------------------

create or replace function fn_verification_events_readonly() returns trigger
language plpgsql as $$
begin
  raise exception 'verification_events is append-only';
end;
$$;

create trigger trg_verification_events_no_update
  before update on verification_events
  for each row execute function fn_verification_events_readonly();

create trigger trg_verification_events_no_delete
  before delete on verification_events
  for each row execute function fn_verification_events_readonly();

-- ---- audit_logs append-only ----------------------------------------------

create or replace function fn_audit_logs_readonly() returns trigger
language plpgsql as $$
begin
  raise exception 'audit_logs is append-only';
end;
$$;

create trigger trg_audit_logs_no_update
  before update on audit_logs
  for each row execute function fn_audit_logs_readonly();

create trigger trg_audit_logs_no_delete
  before delete on audit_logs
  for each row execute function fn_audit_logs_readonly();

-- ---- driver rating aggregate recomputed on rating change ------------------

create or replace function fn_recompute_driver_rating() returns trigger
language plpgsql as $$
declare
  target_driver uuid;
  avg_stars numeric(3,2);
  n int;
begin
  target_driver := coalesce(new.rated_driver_id, old.rated_driver_id);
  if target_driver is null then return coalesce(new, old); end if;

  select avg(stars)::numeric(3,2), count(*)::int
    into avg_stars, n
    from ratings
   where rated_driver_id = target_driver
     and quarantined = false;

  update driver_profiles
     set average_rating = avg_stars,
         total_ratings  = coalesce(n, 0)
   where id = target_driver;

  return coalesce(new, old);
end;
$$;

create trigger trg_ratings_recompute_driver
  after insert or update or delete on ratings
  for each row execute function fn_recompute_driver_rating();

-- ---- commission-band guardrail on rate_card publish (Phase 3 D30) --------
-- Prevents anyone below super_admin from publishing a rate_card where any
-- price_rule's implied commission share is outside [10%, 30%].

create or replace function fn_check_commission_band() returns trigger
language plpgsql as $$
declare
  bad_rule record;
  low_rate  numeric := 0.10;
  high_rate numeric := 0.30;
begin
  if new.status <> 'published' or old.status = 'published' then
    return new;
  end if;

  select pr.id,
         pr.base_customer_price,
         pr.base_driver_payout,
         (pr.base_customer_price - pr.base_driver_payout) / nullif(pr.base_customer_price, 0) as commission_share
    into bad_rule
    from price_rules pr
   where pr.rate_card_id = new.id
     and (
       (pr.base_customer_price - pr.base_driver_payout) / nullif(pr.base_customer_price, 0) < low_rate
       or (pr.base_customer_price - pr.base_driver_payout) / nullif(pr.base_customer_price, 0) > high_rate
     )
   limit 1;

  if bad_rule.id is not null then
    if current_setting('avanti.commission_band_override', true) <> 'true' then
      raise exception 'rate_card % has price_rule % with commission share % percent outside [10, 30]; only super_admin can publish out-of-band',
        new.id, bad_rule.id, round(bad_rule.commission_share * 100, 2);
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_rate_cards_commission_band
  before update on rate_cards
  for each row execute function fn_check_commission_band();

-- ---- engagement price lock — copy from price_quote on confirmation --------

create or replace function fn_engagement_price_lock() returns trigger
language plpgsql as $$
declare
  q price_quotes%rowtype;
begin
  if new.status = 'confirmed' and old.status <> 'confirmed' then
    if new.price_quote_id is null then
      raise exception 'engagement % must have a price_quote before confirmation', new.id;
    end if;

    select * into q from price_quotes where id = new.price_quote_id;
    if not found then
      raise exception 'price_quote % not found', new.price_quote_id;
    end if;
    if q.expires_at < now() then
      raise exception 'price_quote % expired before engagement confirmation', new.price_quote_id;
    end if;
    if q.consumed_at is not null then
      raise exception 'price_quote % already consumed', new.price_quote_id;
    end if;

    new.currency := q.currency;
    new.customer_price_total := q.customer_price_total;
    new.driver_payout_total := q.driver_payout_total;
    new.commission_total := q.commission_total;

    update price_quotes set consumed_at = now() where id = q.id;
  end if;
  return new;
end;
$$;

create trigger trg_engagements_price_lock
  before update on engagements
  for each row execute function fn_engagement_price_lock();

-- ---- verification tier derivation from events ----------------------------
-- On INSERT of an approved event with to_tier, sync driver_profiles.tier.

create or replace function fn_apply_verification_event() returns trigger
language plpgsql as $$
begin
  if new.event_type = 'approved' and new.to_tier is not null then
    update driver_profiles
       set verification_tier = new.to_tier,
           verification_status = 'approved'
     where id = new.driver_id;
  elsif new.event_type = 'rejected' then
    update driver_profiles
       set verification_status = 'rejected'
     where id = new.driver_id;
  elsif new.event_type = 'more_info_requested' then
    update driver_profiles
       set verification_status = 'more_info_needed'
     where id = new.driver_id;
  elsif new.event_type = 'submitted' then
    update driver_profiles
       set verification_status = 'submitted'
     where id = new.driver_id;
  end if;
  return new;
end;
$$;

create trigger trg_verification_events_apply
  after insert on verification_events
  for each row execute function fn_apply_verification_event();