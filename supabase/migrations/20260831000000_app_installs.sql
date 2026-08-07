-- ============================================================================
-- PWA install tracking.
--
-- One row per device that has installed / launched the app from the home screen
-- (running in standalone display mode). We attach the signed-in user when we
-- have one, so ops can see WHO installed. Anonymous installs are still counted
-- by device_id.
-- ============================================================================

begin;

create table if not exists app_installs (
  id uuid primary key default gen_random_uuid(),
  device_id text not null unique,
  user_id uuid references users(id) on delete set null,
  platform text,            -- ios | android | desktop | other
  display_mode text,        -- standalone | browser
  source text,              -- appinstalled | standalone_launch
  user_agent text,
  installed_at timestamptz, -- when we first knew it was installed (appinstalled or first standalone launch)
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists idx_app_installs_installed on app_installs (installed_at desc) where installed_at is not null;
create index if not exists idx_app_installs_user on app_installs (user_id) where user_id is not null;
create index if not exists idx_app_installs_platform on app_installs (platform);

alter table app_installs enable row level security;

drop policy if exists app_installs_admin_read on app_installs;
create policy app_installs_admin_read on app_installs
  for select using (
    exists (select 1 from user_roles where user_id = auth.uid()
      and role in ('admin_support', 'admin_finance', 'admin_compliance', 'admin_verifier', 'super_admin')
      and revoked_at is null)
  );

commit;
