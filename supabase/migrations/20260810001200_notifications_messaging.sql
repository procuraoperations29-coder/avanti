-- ============================================================================
-- Notifications & in-app messaging
-- ============================================================================

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  category text not null,
  title text not null,
  body text not null,
  action_url text,
  entity_id uuid,
  entity_type text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_notifications_user_created on notifications (user_id, created_at desc);
create index idx_notifications_user_unread on notifications (user_id, created_at desc)
  where read_at is null;

create table notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references notifications(id) on delete cascade,
  channel notification_channel not null,
  provider text,
  provider_ref text,
  status notification_status not null default 'pending',
  sent_at timestamptz,
  delivered_at timestamptz,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_notification_deliveries_notification on notification_deliveries (notification_id);
create index idx_notification_deliveries_status on notification_deliveries (status, created_at);

create table notification_preferences (
  user_id uuid not null references users(id) on delete cascade,
  category text not null,
  channel notification_channel not null,
  enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (user_id, category, channel)
);

-- Masked-contact messaging (Phase 1 §12 P1 #10)
create table chat_threads (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null unique references engagements(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references chat_threads(id) on delete cascade,
  sender_user_id uuid not null references users(id),
  body text not null,
  attachments jsonb not null default '[]',
  read_at timestamptz,
  flagged boolean not null default false,
  moderation_notes text,
  created_at timestamptz not null default now()
);

create index idx_chat_messages_thread on chat_messages (thread_id, created_at);
