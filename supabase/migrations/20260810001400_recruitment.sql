-- ============================================================================
-- Recruitment — permanent hire pipeline
-- ============================================================================

create table recruitment_roles (
  id uuid primary key default gen_random_uuid(),
  posted_by_user_id uuid references users(id),
  posted_by_organization_id uuid references organizations(id),
  title text not null,
  description text not null,
  standing_duties text[],
  weekly_hours int,
  work_days day_of_week[],
  rest_days day_of_week[],
  min_verification_tier verification_tier not null default 't3',
  required_vehicle_class text[],
  required_languages text[],
  location geography(Point, 4326),
  compensation_currency currency_code,
  compensation_monthly numeric(15,2),
  status text not null default 'open',
  filled_engagement_id uuid references engagements(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recruitment_has_poster check (
    (posted_by_user_id is not null)::int + (posted_by_organization_id is not null)::int = 1
  )
);

create index idx_recruitment_roles_status on recruitment_roles (status) where status = 'open';

create table recruitment_shortlist_entries (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references recruitment_roles(id) on delete cascade,
  driver_id uuid not null references driver_profiles(id),
  match_score numeric(4,3),
  match_reasons jsonb,
  interview_scheduled_at timestamptz,
  status text not null default 'shortlisted',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uniq_role_driver unique (role_id, driver_id)
);

create index idx_recruitment_shortlist_role on recruitment_shortlist_entries (role_id, status);
create index idx_recruitment_shortlist_driver on recruitment_shortlist_entries (driver_id);
