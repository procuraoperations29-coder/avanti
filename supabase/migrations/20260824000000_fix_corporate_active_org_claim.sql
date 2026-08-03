-- ============================================================================
-- Fix: corporate accounts got active_role = corporate_admin but
-- active_organization_id = null, so the corporate dashboard reported
-- "No organisation on your account yet."
--
-- fn_rebuild_user_claims defaulted the active role to the first role held and
-- set the org to null — but never restored the org when that default role is a
-- corporate role. This adds that step, then backfills existing corporate users.
-- ============================================================================

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
  select coalesce(array_agg(distinct role::text), '{}'::text[])
    into role_list
    from user_roles
   where user_id = target_user and revoked_at is null;

  select coalesce(array_agg(distinct organization_id), '{}'::uuid[])
    into org_list
    from user_roles
   where user_id = target_user and revoked_at is null and organization_id is not null;

  select verification_tier::text
    into tier
    from driver_profiles
   where user_id = target_user and deleted_at is null
   limit 1;

  select raw_app_meta_data into existing_meta from auth.users where id = target_user;

  current_active_role := existing_meta ->> 'active_role';
  current_active_org := nullif(existing_meta ->> 'active_organization_id', '')::uuid;

  if current_active_role is null or not (current_active_role = any(role_list)) then
    current_active_role := role_list[1];
    current_active_org := null;
  end if;

  -- Drop a stale org that the active role no longer covers.
  if current_active_org is not null and not (current_active_org = any(org_list)) then
    current_active_org := null;
  end if;

  -- If the active role is a corporate role but no org is set, adopt the org
  -- that belongs to that role. (This is the fix.)
  if current_active_role in ('corporate_admin', 'corporate_member') and current_active_org is null then
    select organization_id
      into current_active_org
      from user_roles
     where user_id = target_user and revoked_at is null
       and role::text = current_active_role and organization_id is not null
     limit 1;
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

  update public.users
     set active_role = current_active_role::user_role
   where id = target_user;
end;
$$;

-- Backfill everyone currently holding a corporate role so their claim is fixed
-- now (they still need to sign out / in to mint a fresh JWT).
do $$
declare
  u uuid;
begin
  for u in
    select distinct user_id from user_roles
     where revoked_at is null and organization_id is not null
       and role::text in ('corporate_admin', 'corporate_member')
  loop
    perform fn_rebuild_user_claims(u);
  end loop;
end $$;
