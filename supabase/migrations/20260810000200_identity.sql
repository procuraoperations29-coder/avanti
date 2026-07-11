-- ============================================================================
-- Identity & organisations
-- ============================================================================

-- Organisations first (users FKs primary_admin later)
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  legal_name text,
  registration_number text,
  sector text,
  size_bracket text,
  country_code char(2) not null,
  default_currency currency_code not null,
  billing_email citext not null,
  billing_address jsonb not null,
  primary_admin_id uuid,
  approval_threshold numeric(15,2),
  credit_terms_days int not null default 0,
  status organization_status not null default 'pending_verification',
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index idx_organizations_country on organizations (country_code);
create index idx_organizations_status on organizations (status) where deleted_at is null;
create index idx_organizations_name_trgm on organizations using gin (name gin_trgm_ops);

-- Users — shadows auth.users
create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  email citext unique,
  phone text unique,
  full_name text not null,
  display_name text,
  date_of_birth date,
  gender text,
  country_code char(2) not null,
  preferred_language char(2) not null default 'en',
  preferred_currency currency_code,
  active_role user_role,
  status text not null default 'active',
  sessions_revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint users_phone_e164 check (phone is null or phone ~ '^\+[1-9]\d{1,14}$')
);

create index idx_users_country on users (country_code);
create index idx_users_phone_trgm on users using gin (phone gin_trgm_ops);
create index idx_users_email_trgm on users using gin (email gin_trgm_ops);
create index idx_users_active_role on users (active_role) where deleted_at is null;

-- Now the FK from organizations back to users
alter table organizations
  add constraint fk_organizations_primary_admin
  foreign key (primary_admin_id) references users(id);

-- User roles — many-to-many, org-scoped for corporate roles
create table user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  role user_role not null,
  organization_id uuid references organizations(id) on delete cascade,
  permission_overrides jsonb not null default '{}',
  mfa_required boolean not null default false,
  granted_by uuid references users(id),
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint corporate_roles_require_org
    check ((role in ('corporate_admin', 'corporate_member')) = (organization_id is not null))
);

create unique index uniq_user_roles_active
  on user_roles (user_id, role, coalesce(organization_id, '00000000-0000-0000-0000-000000000000'::uuid))
  where revoked_at is null;

create index idx_user_roles_user_active on user_roles (user_id) where revoked_at is null;
create index idx_user_roles_org on user_roles (organization_id) where revoked_at is null;

-- Cost centres — corporate accounting scope
create table cost_centres (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  code text not null,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uniq_cost_centre unique (organization_id, code)
);

create index idx_cost_centres_org on cost_centres (organization_id) where active;

-- Emergency contacts — for driver + safety
create table emergency_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  full_name text not null,
  phone text not null,
  relationship text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint emergency_contacts_phone_e164 check (phone ~ '^\+[1-9]\d{1,14}$')
);

create unique index uniq_primary_emergency_per_user
  on emergency_contacts (user_id) where is_primary;

create index idx_emergency_contacts_user on emergency_contacts (user_id);
