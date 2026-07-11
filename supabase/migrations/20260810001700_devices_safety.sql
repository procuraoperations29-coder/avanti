-- ============================================================================
-- User devices (push tokens) & safety events (SOS)
-- ============================================================================

create table user_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  device_id text not null,
  platform text not null,
  platform_version text,
  app_version text,
  push_token text,
  push_provider text,
  last_seen_at timestamptz,
  first_seen_at timestamptz not null default now(),
  revoked_at timestamptz,
  constraint uniq_user_device unique (user_id, device_id)
);

create index idx_user_devices_user_active on user_devices (user_id) where revoked_at is null;
create index idx_user_devices_push_token on user_devices (push_token) where push_token is not null and revoked_at is null;

create table safety_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  engagement_id uuid references engagements(id),
  event_type text not null,
  location geography(Point, 4326),
  metadata jsonb not null default '{}',
  acknowledged_at timestamptz,
  acknowledged_by uuid references users(id),
  resolved_at timestamptz,
  resolution_notes text,
  created_at timestamptz not null default now()
);

create index idx_safety_events_user on safety_events (user_id, created_at desc);
create index idx_safety_events_unresolved on safety_events (created_at desc)
  where resolved_at is null;
create index idx_safety_events_engagement on safety_events (engagement_id)
  where engagement_id is not null;
