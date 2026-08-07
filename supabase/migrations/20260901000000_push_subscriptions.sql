-- ============================================================================
-- Web Push subscriptions (PWA notifications).
-- One row per browser/device push endpoint, owned by a signed-in user.
-- ============================================================================

begin;

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  device_id text,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  platform text,
  user_agent text,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  last_used_at timestamptz not null default now()
);

create index if not exists idx_push_subs_user on push_subscriptions (user_id) where revoked_at is null;

alter table push_subscriptions enable row level security;

-- Owner manages their own subscriptions.
drop policy if exists push_subs_owner on push_subscriptions;
create policy push_subs_owner on push_subscriptions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Admins can read (for subscriber counts / audit).
drop policy if exists push_subs_admin_read on push_subscriptions;
create policy push_subs_admin_read on push_subscriptions
  for select using (
    exists (select 1 from user_roles where user_id = auth.uid()
      and role in ('admin_support', 'super_admin') and revoked_at is null)
  );

commit;
