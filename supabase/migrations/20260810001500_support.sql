-- ============================================================================
-- Support tickets
-- ============================================================================

create table support_tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_number text not null unique,
  reporter_user_id uuid not null references users(id),
  organization_id uuid references organizations(id),
  engagement_id uuid references engagements(id),
  dispute_id uuid references disputes(id),
  category text not null,
  priority text not null default 'normal',
  status text not null default 'open',
  subject text not null,
  description text,
  assigned_to uuid references users(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_support_tickets_status on support_tickets (status, priority, created_at);
create index idx_support_tickets_reporter on support_tickets (reporter_user_id, created_at desc);
create index idx_support_tickets_assigned on support_tickets (assigned_to, status)
  where status in ('open', 'in_progress');

create table support_ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references support_tickets(id) on delete cascade,
  sender_user_id uuid not null references users(id),
  body text not null,
  internal_note boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_ticket_messages_ticket on support_ticket_messages (ticket_id, created_at);
