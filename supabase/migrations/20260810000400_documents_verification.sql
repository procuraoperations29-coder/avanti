-- ============================================================================
-- Documents & verification
-- ============================================================================

create table documents (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references users(id) on delete cascade,
  document_type document_type not null,
  storage_bucket text not null,
  storage_path text not null,
  mime_type text,
  file_size_bytes bigint,
  sha256 char(64),
  captured_at timestamptz,
  reference_number text,
  expiry_date date,
  metadata jsonb not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index idx_documents_owner_type_active
  on documents (owner_user_id, document_type) where is_active and deleted_at is null;
create index idx_documents_expiring_soon
  on documents (expiry_date) where expiry_date is not null and deleted_at is null;

-- Append-only. UPDATE/DELETE forbidden via trigger (added in functions migration).
create table verification_events (
  id bigserial primary key,
  driver_id uuid not null references driver_profiles(id) on delete cascade,
  event_type verification_event_type not null,
  from_tier verification_tier,
  to_tier verification_tier,
  from_status verification_status,
  to_status verification_status,
  reviewer_user_id uuid references users(id),
  rationale text,
  automated_check text,
  automated_result jsonb,
  requested_docs text[],
  created_at timestamptz not null default now(),
  constraint rationale_required_for_decisions
    check (event_type not in ('approved', 'rejected', 'more_info_requested') or rationale is not null)
);

create index idx_verification_events_driver_created on verification_events (driver_id, created_at desc);
create index idx_verification_events_reviewer on verification_events (reviewer_user_id, created_at desc);
