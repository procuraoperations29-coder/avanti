-- ============================================================================
-- Pricing engine — rate cards, price rules, tax rules, price quotes
--
-- Design invariant (Phase 3 D29): commission is a DERIVED value
-- (customer_price - driver_payout), never stored on price_rules.
-- driver_payout is the stable ground; commission is the residual.
--
-- Contract certainty (Phase 3 D28): rate_cards are versioned; each engagement
-- pins its rate_card_version at booking and bills against that version
-- forever.
-- ============================================================================

create table rate_cards (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  country_code char(2) not null,
  currency currency_code not null,
  version int not null,
  status rate_card_status not null default 'draft',
  effective_from timestamptz,
  effective_until timestamptz,
  published_at timestamptz,
  published_by uuid references users(id),
  retired_at timestamptz,
  retired_by uuid references users(id),
  notes text,
  created_by uuid not null references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint published_needs_effective_from
    check (status <> 'published' or effective_from is not null),
  constraint uniq_country_version unique (country_code, version)
);

-- At most one rate_card published per country per time window
alter table rate_cards add constraint no_overlapping_published_cards
  exclude using gist (
    country_code with =,
    tstzrange(effective_from, coalesce(effective_until, 'infinity'::timestamptz)) with &&
  ) where (status = 'published');

create index idx_rate_cards_country_status on rate_cards (country_code, status);
create index idx_rate_cards_effective on rate_cards (effective_from, effective_until)
  where status = 'published';

create table price_rules (
  id uuid primary key default gen_random_uuid(),
  rate_card_id uuid not null references rate_cards(id) on delete cascade,
  engagement_type engagement_type not null,
  min_verification_tier verification_tier not null,
  vehicle_class text not null,
  time_band text not null default 'day',
  day_type text not null default 'weekday',
  unit text not null,
  base_customer_price numeric(15,2) not null,
  base_driver_payout numeric(15,2) not null,
  overtime_multiplier numeric(5,4),
  overtime_threshold_hours numeric(5,2),
  minimum_charge numeric(15,2),
  cancellation_fee_schedule jsonb not null default '[]',
  no_show_fee numeric(15,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint price_rules_payout_lte_price check (base_driver_payout <= base_customer_price),
  constraint uniq_rate_card_scope unique
    (rate_card_id, engagement_type, min_verification_tier, vehicle_class, time_band, day_type)
);

create index idx_price_rules_card on price_rules (rate_card_id);
create index idx_price_rules_lookup on price_rules
  (rate_card_id, engagement_type, min_verification_tier, vehicle_class, time_band, day_type);

create table tax_rules (
  id uuid primary key default gen_random_uuid(),
  country_code char(2) not null,
  currency currency_code not null,
  tax_type tax_type not null,
  applies_to text not null,
  applies_when_engagement engagement_type[],
  rate numeric(6,5) not null,
  fixed_amount numeric(15,2),
  effective_from date not null,
  effective_until date,
  authority_name text,
  remittance_frequency text,
  status rate_card_status not null default 'draft',
  created_by uuid not null references users(id),
  published_at timestamptz,
  published_by uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_tax_rules_country_type on tax_rules (country_code, tax_type)
  where status = 'published';

-- Immutable-after-write (enforced by trigger). Locked into engagements on book.
create table price_quotes (
  id uuid primary key default gen_random_uuid(),
  rate_card_id uuid not null references rate_cards(id),
  rate_card_version int not null,
  price_rule_id uuid not null references price_rules(id),
  currency currency_code not null,
  engagement_type engagement_type not null,
  min_verification_tier verification_tier not null,
  vehicle_class text not null,
  inputs jsonb not null,
  customer_price_total numeric(15,2) not null,
  driver_payout_total numeric(15,2) not null,
  commission_total numeric(15,2) not null,
  tax_breakdown jsonb not null default '[]',
  requested_by_user_id uuid not null references users(id),
  requested_by_org_id uuid references organizations(id),
  driver_id uuid references driver_profiles(id),
  quote_hash char(64) not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint price_quotes_totals_consistent
    check (customer_price_total = driver_payout_total + commission_total),
  constraint price_quotes_payout_positive check (driver_payout_total >= 0),
  constraint price_quotes_customer_positive check (customer_price_total >= 0)
);

create index idx_price_quotes_requester on price_quotes (requested_by_user_id, created_at desc);
create index idx_price_quotes_unexpired on price_quotes (expires_at) where consumed_at is null;
create unique index uniq_price_quotes_hash on price_quotes (quote_hash);
