-- ============================================================================
-- JWT claim shaping — writes user_roles state into auth.users.raw_app_meta_data
--
-- Supabase Auth reads raw_app_meta_data when it signs JWTs; the fields end
-- up under `app_metadata` in the token. Our RLS policies read from there
-- via auth_role_has(), auth_active_org_id(), auth_aal().
--
-- This trigger keeps that JSON blob in sync with the source of truth
-- (user_roles + driver_profiles.verification_tier).
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
  -- All non-revoked roles for this user
  select coalesce(array_agg(distinct role::text), '{}'::text[])
    into role_list
    from user_roles
   where user_id = target_user
     and revoked_at is null;

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
  -- pick a sensible default (first role held, no org).
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

-- Trigger on user_roles changes
create or replace function fn_user_roles_refresh_claims() returns trigger
language plpgsql
security definer
as $$
begin
  if tg_op = 'DELETE' then
    perform fn_rebuild_user_claims(old.user_id);
    return old;
  else
    perform fn_rebuild_user_claims(new.user_id);
    return new;
  end if;
end;
$$;

create trigger trg_user_roles_refresh_claims
  after insert or update or delete on user_roles
  for each row execute function fn_user_roles_refresh_claims();

-- Trigger on driver_profiles tier changes
create or replace function fn_driver_tier_refresh_claims() returns trigger
language plpgsql
security definer
as $$
begin
  if tg_op = 'UPDATE' and new.verification_tier is distinct from old.verification_tier then
    perform fn_rebuild_user_claims(new.user_id);
  elsif tg_op = 'INSERT' then
    perform fn_rebuild_user_claims(new.user_id);
  end if;
  return new;
end;
$$;

create trigger trg_driver_profiles_refresh_claims
  after insert or update of verification_tier on driver_profiles
  for each row execute function fn_driver_tier_refresh_claims();

-- Trigger on auth.users insert — creates the public.users shadow row
-- and initialises empty app_metadata so downstream code can read it safely.
create or replace function fn_handle_new_auth_user() returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  full_name_val text;
begin
  full_name_val := coalesce(
    new.raw_user_meta_data ->> 'full_name',
    split_part(coalesce(new.email, new.phone, ''), '@', 1),
    'User'
  );

  insert into public.users (id, email, phone, full_name, country_code, preferred_language)
  values (
    new.id,
    new.email,
    new.phone,
    full_name_val,
    coalesce(new.raw_user_meta_data ->> 'country_code', 'NG'),
    coalesce(new.raw_user_meta_data ->> 'preferred_language', 'en')
  )
  on conflict (id) do nothing;

  -- Initialise app_metadata with empty arrays so the JWT has stable shape
  update auth.users
     set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
       || jsonb_build_object(
            'roles', '[]'::jsonb,
            'organization_ids', '[]'::jsonb,
            'active_role', null,
            'active_organization_id', null,
            'verification_tier', null
          )
   where id = new.id;

  return new;
end;
$$;

create trigger trg_auth_users_handle_new
  after insert on auth.users
  for each row execute function fn_handle_new_auth_user();
