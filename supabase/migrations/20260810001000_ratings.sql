-- ============================================================================
-- Ratings — two-sided (customer/driver), interval-scoped on substitutions
-- ============================================================================

create table ratings (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references engagements(id),
  substitution_id uuid references substitutions(id),
  rated_kind rating_target not null,
  rater_user_id uuid not null references users(id),
  rated_driver_id uuid references driver_profiles(id),
  rated_user_id uuid references users(id),
  stars smallint not null,
  tags text[],
  comment text,
  quarantined boolean not null default false,
  quarantine_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stars_range check (stars between 1 and 5),
  constraint rating_target_matches check (
    (rated_kind = 'driver' and rated_driver_id is not null and rated_user_id is null)
    or (rated_kind = 'customer' and rated_user_id is not null and rated_driver_id is null)
  )
);

-- Uniqueness needs an expression (coalesce for the null substitution case),
-- so it's a unique index, not a table constraint.
create unique index uniq_rating_per_engagement_target_interval on ratings
  (engagement_id, rated_kind, coalesce(substitution_id, '00000000-0000-0000-0000-000000000000'::uuid));

create index idx_ratings_rated_driver on ratings (rated_driver_id)
  where rated_kind = 'driver' and not quarantined;
create index idx_ratings_rated_user on ratings (rated_user_id)
  where rated_kind = 'customer' and not quarantined;
create index idx_ratings_engagement on ratings (engagement_id);
