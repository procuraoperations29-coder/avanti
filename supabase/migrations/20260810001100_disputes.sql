-- ============================================================================
-- Dispute detail — evidence, messages, structured outcomes
-- (base disputes table was created in the money migration due to FK ordering)
-- ============================================================================

create table dispute_evidence (
  id uuid primary key default gen_random_uuid(),
  dispute_id uuid not null references disputes(id) on delete cascade,
  source evidence_source not null,
  uploaded_by uuid references users(id),
  kind text not null,
  storage_path text,
  reference_id uuid,
  content_hash char(64),
  captured_at timestamptz,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index idx_dispute_evidence_dispute on dispute_evidence (dispute_id, created_at);

create table dispute_messages (
  id uuid primary key default gen_random_uuid(),
  dispute_id uuid not null references disputes(id) on delete cascade,
  sender_user_id uuid references users(id),
  sender_role text not null,
  body text not null,
  visible_to text[] not null default array['raiser', 'respondent', 'avanti'],
  flagged boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_dispute_messages_dispute on dispute_messages (dispute_id, created_at);

-- Structured outcomes (Phase 1 D10) — multiple can combine per resolution
create table dispute_outcomes (
  id uuid primary key default gen_random_uuid(),
  dispute_id uuid not null references disputes(id) on delete cascade,
  kind dispute_outcome_kind not null,
  amount numeric(15,2),
  currency currency_code,
  target_user_id uuid references users(id),
  target_driver_id uuid references driver_profiles(id),
  target_organization_id uuid references organizations(id),
  notes text,
  effective_from date,
  effective_until date,
  applied_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_dispute_outcomes_dispute on dispute_outcomes (dispute_id);
