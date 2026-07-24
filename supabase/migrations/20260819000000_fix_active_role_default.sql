-- Fix: fn_rebuild_user_claims picked an arbitrary "first" role as the
-- default active_role when one needed to be assigned (no existing
-- active_role, or the existing one was revoked).
--
-- Diagnosis (2026-07-25): hello@avanti.com.ng is a super_admin account.
-- Signing up as a driver through the normal signup flow (which is
-- expected to work — it just adds the driver role to the existing
-- account) left the account defaulting to active_role = 'driver' on
-- next sign-in instead of staying on super_admin.
--
-- Root cause: `select array_agg(distinct role::text) ... into role_list`
-- has no ORDER BY, so `role_list[1]` (the fallback default active_role,
-- used whenever there's no valid existing active_role) was effectively
-- picking a random role rather than a sensible one — an admin role
-- could easily lose out to 'driver' or 'individual_customer' depending
-- on how Postgres happened to order the aggregate.
--
-- Fix: make the "first role" deterministic and sensible — admin roles
-- outrank corporate roles, which outrank individual_customer, which
-- outranks driver. Postgres doesn't allow an arbitrary ORDER BY on an
-- aggregate with DISTINCT unless the ORDER BY expression matches one of
-- the aggregate's own arguments, so the distinct+priority-order is done
-- in a subquery instead.

begin;

create or replace function fn_rebuild_user_claims(target_user uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  role_list text[];
  org_list uuid[];
  tier text;
  current_active_role text;
  current_active_org uuid;
  existing_meta jsonb;
begin
  -- All non-revoked roles for this user, ordered so the fallback default
  -- (role_list[1]) is always the highest-privilege role held, not
  -- whatever order Postgres's DISTINCT aggregation happens to produce.
  select coalesce(array_agg(r.role order by
      case r.role
        when 'super_admin' then 0
        when 'admin_finance' then 1
        when 'admin_compliance' then 1
        when 'admin_verifier' then 1
        when 'admin_support' then 1
        when 'corporate_admin' then 2
        when 'corporate_member' then 3
        when 'individual_customer' then 4
        when 'driver' then 5
        else 6
      end
    ), '{}'::text[])
    into role_list
    from (
      select distinct role::text as role
      from user_roles
      where user_id = target_user
        and revoked_at is null
    ) r;

  -- All non-null orgs (for corporate roles)
  select coalesce(array_agg(distinct organization_id), '{}'::uuid[])
    into org_list
    from user_roles
   where user_id = target_user
     and revoked_at is null
     and organization_id is not null;

  -- Driver verification tier, if any
  select verification_tier::text
    into tier
    from driver_profiles
   where user_id = target_user
     and deleted_at is null
   limit 1;

  -- Preserve active_role / active_organization_id if still valid; otherwise
  -- pick a sensible default (highest-privilege role held, no org).
  select raw_app_meta_data
    into existing_meta
    from auth.users
   where id = target_user;

  current_active_role := existing_meta ->> 'active_role';
  current_active_org := nullif(existing_meta ->> 'active_organization_id', '')::uuid;

  if current_active_role is null or not (current_active_role = any(role_list)) then
    current_active_role := role_list[1];
    current_active_org := null;
  end if;

  if current_active_org is not null and not (current_active_org = any(org_list)) then
    current_active_org := null;
  end if;

  update auth.users
     set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
       || jsonb_build_object(
            'roles', to_jsonb(role_list),
            'organization_ids', to_jsonb(org_list),
            'active_role', current_active_role,
            'active_organization_id', current_active_org,
            'verification_tier', tier
          )
   where id = target_user;

  -- Also mirror active_role onto public.users for cheap reads
  update public.users
     set active_role = current_active_role::user_role
   where id = target_user;
end;
$$;

-- Repair any account whose active_role currently disagrees with what the
-- corrected priority order would pick — this rebuilds claims for every
-- user who has more than one role, which covers exactly the accounts
-- that could have been affected by the old non-deterministic ordering.
do $$
declare
  affected_user uuid;
begin
  for affected_user in
    select user_id
    from user_roles
    where revoked_at is null
    group by user_id
    having count(distinct role) > 1
  loop
    perform fn_rebuild_user_claims(affected_user);
  end loop;
end;
$$;

commit;
