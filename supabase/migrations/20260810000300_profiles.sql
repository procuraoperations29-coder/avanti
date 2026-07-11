-- ============================================================================
-- Profiles, availability, payout methods, vehicles
-- ============================================================================

create table customer_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references users(id) on delete cascade,
  home_address jsonb,
  home_location geography(Point, 4326),
  default_pickup_location geography(Point, 4326),
  saved_locations jsonb not null default '[]',
  preferred_engagement_types engagement_type[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_customer_profiles_home_geo on customer_profiles using gist (home_location);

create table driver_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references users(id) on delete cascade,
  bio text,
  years_experience int not null default 0,
  languages text[] not null default '{}',
  vehicle_class_experience text[] not null default '{}',
  transmission_experience text[] not null default '{}',
  home_base_location geography(Point, 4326),
  service_radius_km int,
  tin text,
  verification_tier verification_tier not null default 't0',
  verification_status verification_status not null default 'not_started',
  reliability_score numeric(4,3) not null default 1.000,
  average_rating numeric(3,2),
  total_ratings int not null default 0,
  completed_jobs int not null default 0,
  accepts_engagement_types engagement_type[] not null default '{}',
  min_acceptable_tier verification_tier,
  suspended boolean not null default false,
  suspended_reason text,
  suspended_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint driver_reliability_range check (reliability_score between 0 and 1)
);

create index idx_driver_profiles_geo on driver_profiles using gist (home_base_location);
create index idx_driver_profiles_tier on driver_profiles (verification_tier)
  where deleted_at is null and not suspended;
create index idx_driver_profiles_langs on driver_profiles using gin (languages);
create index idx_driver_profiles_vehicles on driver_profiles using gin (vehicle_class_experience);
create index idx_driver_profiles_rating on driver_profiles (average_rating desc nulls last)
  where deleted_at is null and not suspended;
create index idx_driver_search_composite on driver_profiles
  (verification_tier, average_rating desc nulls last)
  where deleted_at is null and not suspended;

-- Weekly recurring availability
create table driver_availabilities (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references driver_profiles(id) on delete cascade,
  day_of_week day_of_week not null,
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint availability_valid_range check (start_time < end_time),
  constraint uniq_driver_day_range unique (driver_id, day_of_week, start_time, end_time)
);

create index idx_driver_availabilities_driver on driver_availabilities (driver_id);

-- Blackout dates (holidays, personal time off)
create table driver_blackouts (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references driver_profiles(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text,
  created_at timestamptz not null default now(),
  constraint blackout_valid_range check (starts_at < ends_at),
  constraint no_overlapping_blackouts exclude using gist (
    driver_id with =,
    tstzrange(starts_at, ends_at) with &&
  )
);

create index idx_driver_blackouts_driver_range on driver_blackouts (driver_id, starts_at, ends_at);

-- Payout methods — highest-sensitivity table.
-- account_number is encrypted at rest via Vault; this column holds the vault reference.
create table driver_payout_methods (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references driver_profiles(id) on delete cascade,
  method_type payout_method_type not null,
  bank_code text,
  account_number_vault_ref text,      -- pointer to Supabase Vault
  account_number_last4 char(4),        -- for display
  account_holder_name text not null,
  mobile_money_provider text,
  mobile_money_msisdn_vault_ref text,
  kyc_status text not null default 'pending',
  kyc_provider_ref text,
  kyc_name_match_score numeric(4,3),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint bank_or_mobile check (
    (method_type = 'bank_account' and bank_code is not null and account_number_last4 is not null)
    or (method_type = 'mobile_money' and mobile_money_msisdn_vault_ref is not null)
  )
);

create unique index uniq_default_payout_method_per_driver
  on driver_payout_methods (driver_id) where is_default and deleted_at is null;
create index idx_driver_payout_methods_driver on driver_payout_methods (driver_id) where deleted_at is null;

-- Customer vehicles — the vehicle is first-class because drivers operate it
create table customer_vehicles (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references users(id) on delete cascade,
  owner_organization_id uuid references organizations(id) on delete cascade,
  make text not null,
  model text not null,
  year int,
  colour text,
  plate_number text,
  vehicle_class text not null,
  transmission text not null,
  insurance_status text,
  insurance_expiry date,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint vehicle_has_owner check (
    (owner_user_id is not null)::int + (owner_organization_id is not null)::int = 1
  )
);

create unique index uniq_default_vehicle_per_user
  on customer_vehicles (owner_user_id)
  where is_default and owner_user_id is not null and deleted_at is null;
create unique index uniq_default_vehicle_per_org
  on customer_vehicles (owner_organization_id)
  where is_default and owner_organization_id is not null and deleted_at is null;

create index idx_customer_vehicles_owner_user on customer_vehicles (owner_user_id) where deleted_at is null;
create index idx_customer_vehicles_owner_org on customer_vehicles (owner_organization_id) where deleted_at is null;
