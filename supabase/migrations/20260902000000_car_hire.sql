-- ============================================================================
-- Car hire — bundled car + driver, priced by vehicle and duration.
--
-- Avanti does NOT own these vehicles: they are supplied by external leasing
-- partners. A quote bundles a partner's car with an Avanti driver, priced by
-- the car's daily rate × days (+ overtime) plus a driver day-rate, + VAT.
--
--   leasing_partners   — the supplier Avanti pays (out-of-band settlement).
--   hire_vehicles      — a partner's car + its pricing (customer rate vs cost).
--   car_hire_bookings  — the request→ops-confirmed-quote→invoice→paid lifecycle
--                        (mirrors trip_requests; ops confirms availability with
--                        the partner and assigns a driver before invoicing).
--
-- Money model per booking:
--   vehicle_subtotal = daily_rate      × days (+ overtime)   -- customer pays
--   driver_subtotal  = driver_daily_rate × days              -- customer pays
--   partner_cost_total = partner_daily_cost × days           -- Avanti → partner
--   driver_pay_total   = driver_daily_pay   × days           -- Avanti → driver
--   vat_amount = 7.5% of (vehicle_subtotal + driver_subtotal)
--   offer_total = vehicle_subtotal + driver_subtotal + vat_amount  -- customer
--   margin_total = (vehicle_subtotal + driver_subtotal)
--                  - partner_cost_total - driver_pay_total          -- Avanti keeps
-- ============================================================================

begin;

-- ---- Leasing partners ------------------------------------------------------
create table if not exists leasing_partners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  legal_name text,
  contact_name text,
  contact_phone text,
  contact_email text,
  city text,
  -- settlement details (Avanti pays the partner out-of-band for now)
  bank_name text,
  bank_code text,
  account_number_last4 text,
  account_holder_name text,
  status text not null default 'active' check (status in ('active', 'suspended', 'closed')),
  notes text,
  metadata jsonb not null default '{}',
  created_by uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_leasing_partners_status on leasing_partners (status) where deleted_at is null;

-- ---- Hire vehicles (partner fleet inventory) -------------------------------
create table if not exists hire_vehicles (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references leasing_partners(id) on delete cascade,
  make text not null,
  model text not null,
  year int,
  colour text,
  plate_number text,
  vehicle_class text not null,           -- sedan / suv / executive / van / pickup
  transmission text,                     -- automatic / manual
  seats int,
  features text[] not null default '{}',
  city text,
  photo_path text,                       -- path in the car-hire-vehicles bucket
  -- pricing (NGN, per day unless noted)
  partner_daily_cost numeric(12,2) not null default 0,   -- Avanti pays the partner
  daily_rate numeric(12,2) not null default 0,           -- customer pays (vehicle only)
  included_hours_per_day numeric(4,2) not null default 10,
  overtime_hourly_rate numeric(12,2),                    -- charge beyond included hours
  min_days int not null default 1,
  driver_daily_rate numeric(12,2) not null default 0,    -- customer pays (driver)
  driver_daily_pay numeric(12,2) not null default 0,     -- Avanti pays the driver
  status text not null default 'available'
    check (status in ('available', 'unavailable', 'maintenance', 'retired')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint hire_vehicle_margin_nonneg check (daily_rate >= partner_daily_cost),
  constraint hire_vehicle_driver_margin_nonneg check (driver_daily_rate >= driver_daily_pay)
);

create index if not exists idx_hire_vehicles_partner on hire_vehicles (partner_id);
create index if not exists idx_hire_vehicles_browse
  on hire_vehicles (vehicle_class, status) where is_active and deleted_at is null;

-- ---- Car hire bookings (request → quote → paid lifecycle) ------------------
create table if not exists car_hire_bookings (
  id uuid primary key default gen_random_uuid(),
  customer_user_id uuid not null references users(id) on delete cascade,
  vehicle_id uuid references hire_vehicles(id) on delete set null,
  partner_id uuid references leasing_partners(id) on delete set null,
  -- request
  start_date date not null,
  end_date date not null,
  days int not null,
  hours_per_day numeric(4,2) not null default 10,
  pickup_address jsonb,
  city text,
  passengers int,
  special_requirements text,
  contact_phone text,
  currency text not null default 'NGN',
  -- indicative price snapshot shown to the customer at request time
  indicative_total numeric(12,2),
  status text not null default 'new'
    check (status in ('new', 'reviewing', 'quoted', 'accepted', 'paid', 'active', 'completed', 'declined', 'cancelled')),
  -- ops-confirmed offer
  assigned_driver_id uuid references driver_profiles(id) on delete set null,
  vehicle_subtotal numeric(12,2),
  driver_subtotal numeric(12,2),
  partner_cost_total numeric(12,2),
  driver_pay_total numeric(12,2),
  vat_amount numeric(12,2),
  offer_total numeric(12,2),
  margin_total numeric(12,2),
  offer_conditions text,
  admin_notes text,
  quoted_by uuid references users(id),
  quoted_at timestamptz,
  -- payment
  payment_reference text unique,
  payment_link text,
  payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'paid', 'manual_paid')),
  invoice_sent_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint car_hire_dates_valid check (end_date >= start_date)
);

create index if not exists idx_car_hire_bookings_status on car_hire_bookings (status) where deleted_at is null;
create index if not exists idx_car_hire_bookings_customer on car_hire_bookings (customer_user_id);
create index if not exists idx_car_hire_bookings_vehicle on car_hire_bookings (vehicle_id);

-- ---- RLS -------------------------------------------------------------------
alter table leasing_partners enable row level security;
alter table hire_vehicles enable row level security;
alter table car_hire_bookings enable row level security;

-- Car-hire admins: finance + support + super manage partners, vehicles, bookings.
drop policy if exists leasing_partners_admin_all on leasing_partners;
create policy leasing_partners_admin_all on leasing_partners
  for all using (
    auth_role_has('admin_finance') or auth_role_has('admin_support') or auth_role_has('super_admin')
  ) with check (
    auth_role_has('admin_finance') or auth_role_has('admin_support') or auth_role_has('super_admin')
  );

drop policy if exists hire_vehicles_admin_all on hire_vehicles;
create policy hire_vehicles_admin_all on hire_vehicles
  for all using (
    auth_role_has('admin_finance') or auth_role_has('admin_support') or auth_role_has('super_admin')
  ) with check (
    auth_role_has('admin_finance') or auth_role_has('admin_support') or auth_role_has('super_admin')
  );

-- Bookings: the owning customer can read + create their own; admins manage all.
drop policy if exists car_hire_customer_read on car_hire_bookings;
create policy car_hire_customer_read on car_hire_bookings
  for select using (customer_user_id = auth.uid());

drop policy if exists car_hire_customer_insert on car_hire_bookings;
create policy car_hire_customer_insert on car_hire_bookings
  for insert with check (customer_user_id = auth.uid());

drop policy if exists car_hire_admin_all on car_hire_bookings;
create policy car_hire_admin_all on car_hire_bookings
  for all using (
    auth_role_has('admin_finance') or auth_role_has('admin_support') or auth_role_has('super_admin')
  ) with check (
    auth_role_has('admin_finance') or auth_role_has('admin_support') or auth_role_has('super_admin')
  );

-- ---- Vehicle photo storage bucket (public read; catalog images) ------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('car-hire-vehicles', 'car-hire-vehicles', true, 10485760) -- 10 MB
on conflict (id) do nothing;

-- Admins can upload/replace/delete vehicle photos; everyone can read (public).
drop policy if exists car_hire_photo_admin_write on storage.objects;
create policy car_hire_photo_admin_write on storage.objects for insert
  with check (
    bucket_id = 'car-hire-vehicles'
    and (auth_role_has('admin_finance') or auth_role_has('admin_support') or auth_role_has('super_admin'))
  );

drop policy if exists car_hire_photo_admin_update on storage.objects;
create policy car_hire_photo_admin_update on storage.objects for update
  using (
    bucket_id = 'car-hire-vehicles'
    and (auth_role_has('admin_finance') or auth_role_has('admin_support') or auth_role_has('super_admin'))
  );

drop policy if exists car_hire_photo_admin_delete on storage.objects;
create policy car_hire_photo_admin_delete on storage.objects for delete
  using (
    bucket_id = 'car-hire-vehicles'
    and (auth_role_has('admin_finance') or auth_role_has('admin_support') or auth_role_has('super_admin'))
  );

commit;
