-- ============================================================================
-- Engagements (the spine), work sessions, insurance, favourites
-- ============================================================================

create table engagements (
  id uuid primary key default gen_random_uuid(),

  -- Actors
  customer_user_id uuid references users(id),
  customer_organization_id uuid references organizations(id),
  driver_id uuid references driver_profiles(id),
  original_driver_id uuid references driver_profiles(id),

  -- Corporate metadata
  cost_centre_id uuid references cost_centres(id),
  purchase_order_number text,
  requested_by_user_id uuid references users(id),

  -- Type & status
  engagement_type engagement_type not null,
  status engagement_status not null default 'draft',

  -- Timing
  starts_at timestamptz,
  ends_at timestamptz,
  expected_daily_hours numeric(4,2),
  timezone text not null default 'UTC',

  -- Vehicle & location
  vehicle_id uuid references customer_vehicles(id),
  pickup_address jsonb,
  pickup_location geography(Point, 4326),

  -- Preferences
  special_instructions text,
  min_verification_tier verification_tier not null default 't2',
  auto_substitute_policy text not null default 'notify_and_approve',

  -- Pricing lock (denormalised from price_quotes for query speed)
  price_quote_id uuid references price_quotes(id),
  currency currency_code,
  customer_price_total numeric(15,2),
  driver_payout_total numeric(15,2),
  commission_total numeric(15,2),

  -- Contract (FK added after contracts table exists)
  contract_id uuid,

  -- Lifecycle
  requested_at timestamptz,
  accepted_at timestamptz,
  confirmed_at timestamptz,
  activated_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancelled_reason text,
  cancelled_by_user_id uuid references users(id),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,

  constraint engagement_has_customer check (
    (customer_user_id is not null)::int + (customer_organization_id is not null)::int = 1
  ),
  constraint engagement_time_order check (
    starts_at is null or ends_at is null or starts_at < ends_at
  )
);

create index idx_engagements_customer_user on engagements
  (customer_user_id, status, starts_at desc) where deleted_at is null;
create index idx_engagements_customer_org on engagements
  (customer_organization_id, status, starts_at desc) where deleted_at is null;
create index idx_engagements_driver on engagements
  (driver_id, status, starts_at desc) where deleted_at is null;
create index idx_engagements_status_starts on engagements
  (status, starts_at) where deleted_at is null;
create index idx_engagements_pickup_geo on engagements using gist (pickup_location);
create index idx_engagements_time_range on engagements
  using gist (tstzrange(starts_at, ends_at)) where deleted_at is null;
create index idx_driver_upcoming_engagements on engagements (driver_id, starts_at)
  where status in ('confirmed', 'active', 'reassigning_mid') and deleted_at is null;

-- Append-only status transition log
create table engagement_status_transitions (
  id bigserial primary key,
  engagement_id uuid not null references engagements(id) on delete cascade,
  from_status engagement_status,
  to_status engagement_status not null,
  reason text,
  triggered_by uuid references users(id),
  metadata jsonb not null default '{}',
  occurred_at timestamptz not null default now()
);

create index idx_engagement_transitions_engagement on engagement_status_transitions
  (engagement_id, occurred_at);

-- Per-shift work sessions — objective worked time
create table work_sessions (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references engagements(id) on delete cascade,
  driver_id uuid not null references driver_profiles(id),
  session_date date not null,
  check_in_at timestamptz,
  check_out_at timestamptz,
  check_in_code char(4),
  customer_confirmed_at timestamptz,
  driver_confirmed_at timestamptz,
  breaks jsonb not null default '[]',
  gps_trail_ref text,
  overtime_hours numeric(5,2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint work_session_times check (
    check_out_at is null or check_in_at is null or check_out_at > check_in_at
  )
);

create index idx_work_sessions_engagement on work_sessions (engagement_id, session_date);
create index idx_work_sessions_driver_date on work_sessions (driver_id, session_date);

-- Insurance captured at booking (Phase 2 §6.4 Step 2)
create table engagement_insurance (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null unique references engagements(id) on delete cascade,
  insurance_type text,
  policy_number text,
  insurer_name text,
  expiry_date date,
  customer_declared_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table favourite_drivers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  driver_id uuid not null references driver_profiles(id) on delete cascade,
  note text,
  created_at timestamptz not null default now(),
  constraint uniq_user_favourite_driver unique (user_id, driver_id)
);

create index idx_favourite_drivers_user on favourite_drivers (user_id);
