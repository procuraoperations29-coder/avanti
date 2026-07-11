-- ============================================================================
-- Audit & compliance
-- audit_logs is append-only. UPDATE/DELETE forbidden via trigger + RLS.
-- ============================================================================

create table audit_logs (
  id bigserial primary key,
  actor_user_id uuid references users(id),
  actor_role user_role,
  entity_type text not null,
  entity_id uuid,
  action audit_action not null,
  changes jsonb,
  ip_address inet,
  user_agent text,
  request_id uuid,
  metadata jsonb not null default '{}',
  occurred_at timestamptz not null default now()
);

create index idx_audit_logs_entity on audit_logs (entity_type, entity_id, occurred_at desc);
create index idx_audit_logs_actor on audit_logs (actor_user_id, occurred_at desc);
create index idx_audit_logs_action_time on audit_logs (action, occurred_at desc);

-- NDPR / POPIA / GDPR-equivalent right-to-erasure/access/portability
create table data_subject_requests (
  id uuid primary key default gen_random_uuid(),
  requester_user_id uuid not null references users(id),
  request_type text not null,
  status text not null default 'received',
  legal_basis text,
  notes text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_dsr_status on data_subject_requests (status, created_at);
