-- ============================================================================
-- Corporate — approvals workflow
-- ============================================================================

create table approvals (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  organization_id uuid not null references organizations(id),
  requester_user_id uuid not null references users(id),
  approver_user_id uuid references users(id),
  status approval_status not null default 'pending',
  reason text,
  decided_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_approvals_entity on approvals (entity_type, entity_id);
create index idx_approvals_approver_pending on approvals (approver_user_id, status) where status = 'pending';
create index idx_approvals_org_status on approvals (organization_id, status);
