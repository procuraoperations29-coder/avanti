-- ============================================================================
-- Substitution & backup pool
--
-- Substitution is a first-class primitive (Phase 1 D7). Never cancel-and-rebook.
-- One engagement can accumulate a chain of Substitutions with independent
-- payouts, commission entries, and ratings per interval.
-- ============================================================================

create table substitutions (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references engagements(id) on delete cascade,
  original_driver_id uuid not null references driver_profiles(id),
  substitute_driver_id uuid references driver_profiles(id),
  trigger substitution_trigger not null,
  reason substitution_reason,
  justification_verified boolean not null default false,
  reason_details text,
  interval_starts_at timestamptz not null,
  interval_ends_at timestamptz not null,
  proposed_candidates jsonb not null default '[]',
  customer_approval_required boolean not null,
  customer_approved_at timestamptz,
  customer_approved_by uuid references users(id),
  substitute_accepted_at timestamptz,
  status substitution_status not null default 'proposed',
  addendum_contract_id uuid references contracts(id),
  handover_briefing_ref text,
  original_driver_penalty_amount numeric(15,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint substitution_interval_valid check (interval_starts_at < interval_ends_at)
);

create index idx_substitutions_engagement on substitutions (engagement_id, interval_starts_at);
create index idx_substitutions_original on substitutions (original_driver_id, created_at desc);
create index idx_substitutions_substitute on substitutions (substitute_driver_id, created_at desc)
  where substitute_driver_id is not null;
create index idx_substitutions_status_time on substitutions (status, interval_starts_at);

-- Mandatory for individual permanent hires (Phase 1 §6.1 r1.1)
create table backup_pool_nominations (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references engagements(id) on delete cascade,
  nominated_driver_id uuid not null references driver_profiles(id),
  priority int not null,
  on_call_accepted boolean not null default false,
  on_call_accepted_at timestamptz,
  retainer_amount numeric(15,2),
  currency currency_code,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uniq_backup_priority unique (engagement_id, priority),
  constraint uniq_backup_driver unique (engagement_id, nominated_driver_id)
);

create index idx_backup_engagement on backup_pool_nominations (engagement_id) where active;
create index idx_backup_driver on backup_pool_nominations (nominated_driver_id) where active;
