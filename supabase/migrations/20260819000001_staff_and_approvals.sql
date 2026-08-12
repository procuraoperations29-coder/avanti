-- Staff management + maker-checker approval queue (Phase 1).
--
-- Design:
--   - Deactivating a staffer reuses the existing user_roles.revoked_at
--     column (no schema change needed — a revoked role already means
--     "can't act as this role anymore").
--   - Suspension is new and separate from revocation: a temporary block
--     that's meant to be lifted, mirroring the suspended/suspended_reason/
--     suspended_until pattern already used on driver_profiles.
--   - requires_approval + approver_user_id are per role-assignment (not
--     per user), so a staffer with more than one admin role could in
--     principle have a different approver per department, and so this
--     is genuinely configurable per person as discussed.
--   - pending_approvals is deliberately generic (action_type + payload)
--     rather than one table per department, so every department's write
--     actions (verification, batches, placements, compliance) can route
--     through the same queue and the same /admin/approvals page. Each
--     department's retrofit (Phase 3) just needs to know how to build
--     the right payload and how to apply it once approved.

begin;

alter table user_roles
  add column if not exists requires_approval boolean not null default false,
  add column if not exists approver_user_id uuid references users(id),
  add column if not exists suspended boolean not null default false,
  add column if not exists suspended_reason text,
  add column if not exists suspended_until timestamptz;

alter table user_roles
  add constraint user_roles_approver_required_check
  check (not requires_approval or approver_user_id is not null);

comment on column user_roles.requires_approval is
  'If true, this person''s actions in this role are staged in pending_approvals instead of applied directly.';
comment on column user_roles.approver_user_id is
  'Who reviews this specific person''s pending actions. Required when requires_approval is true.';
comment on column user_roles.suspended is
  'Temporary block, distinct from revoked_at (permanent). A suspended role can be reinstated.';

create table if not exists pending_approvals (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  requested_by uuid not null references users(id),
  approver_user_id uuid not null references users(id),

  -- Which admin area this belongs to, for filtering the queue UI.
  department text not null check (
    department in ('verification', 'finance', 'placements', 'compliance', 'support')
  ),

  -- Machine-readable key describing what kind of action this is, e.g.
  -- 'verification_decision.approve', 'payout_batch.release',
  -- 'placement_enquiry.status_change'. Phase 3 defines the actual set
  -- and how each one gets applied.
  action_type text not null,

  -- Same entity_type/entity_id convention as audit_logs, for consistency.
  entity_type text,
  entity_id uuid,

  -- Everything needed to actually apply the action once approved.
  payload jsonb not null default '{}'::jsonb,

  -- Human-readable one-liner for the queue UI, e.g.
  -- "Approve driver John Doe -> Tier 2", so the approver doesn't have
  -- to decode payload JSON to know what they're looking at.
  summary text not null,

  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_at timestamptz,
  reviewed_by uuid references users(id),
  review_note text
);

create index if not exists idx_pending_approvals_approver_status
  on pending_approvals (approver_user_id, status);
create index if not exists idx_pending_approvals_department_status
  on pending_approvals (department, status);
create index if not exists idx_pending_approvals_requested_by
  on pending_approvals (requested_by);

commit;
