-- Slice 9: Permanent placements (minimum viable)
--
-- Adds two things to driver_profiles so drivers can choose their availability:
--   available_on_demand  — willing to take hourly/daily bookings (default true)
--   available_permanent  — willing to take permanent placements (default false)
--
-- Two new tables:
--   placement_enquiries — customer submits interest in a specific driver
--   placements          — once matched, the ongoing relationship (admin creates
--                          these; for MVP, manual SQL is fine)
--
-- Salary is NOT stored on driver_profiles — it's computed from tier via the
-- lib/permanent/salary.ts helper. Individual per-driver salary overrides are a
-- v2 concern.

begin;

-- Availability preferences
alter table driver_profiles
  add column if not exists available_on_demand boolean not null default true,
  add column if not exists available_permanent boolean not null default false;

-- Enquiries: customer says "I want to hire this driver as a permanent"
create table if not exists placement_enquiries (
  id uuid primary key default gen_random_uuid(),
  customer_user_id uuid not null references public.users(id),
  driver_id uuid not null references driver_profiles(id),
  requirements text not null,
  preferred_start_date date,
  contact_method text not null default 'whatsapp'
    check (contact_method in ('whatsapp', 'email', 'phone')),
  contact_detail text not null,
  status text not null default 'new'
    check (status in ('new', 'reviewing', 'introduced', 'matched', 'closed', 'declined')),
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_placement_enquiries_status
  on placement_enquiries(status, created_at desc);
create index if not exists idx_placement_enquiries_customer
  on placement_enquiries(customer_user_id);
create index if not exists idx_placement_enquiries_driver
  on placement_enquiries(driver_id);

-- Placements: the ongoing relationship once matched
create table if not exists placements (
  id uuid primary key default gen_random_uuid(),
  enquiry_id uuid references placement_enquiries(id),
  driver_id uuid not null references driver_profiles(id),
  customer_user_id uuid not null references public.users(id),
  monthly_salary numeric(12,2) not null,
  currency text not null default 'NGN',
  start_date date not null,
  end_date date,
  status text not null default 'pending'
    check (status in ('pending', 'active', 'ended', 'cancelled')),
  end_reason text,
  activated_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_placements_status
  on placements(status, start_date desc);
create index if not exists idx_placements_driver on placements(driver_id);
create index if not exists idx_placements_customer on placements(customer_user_id);

-- RLS
alter table placement_enquiries enable row level security;
alter table placements enable row level security;

drop policy if exists placement_enquiries_customer_read on placement_enquiries;
create policy placement_enquiries_customer_read on placement_enquiries
  for select using (customer_user_id = auth.uid());

drop policy if exists placement_enquiries_customer_insert on placement_enquiries;
create policy placement_enquiries_customer_insert on placement_enquiries
  for insert with check (customer_user_id = auth.uid());

drop policy if exists placement_enquiries_admin_all on placement_enquiries;
create policy placement_enquiries_admin_all on placement_enquiries
  for all using (
    exists (
      select 1 from user_roles
      where user_id = auth.uid()
        and role in ('admin_support', 'admin_verifier', 'super_admin')
    )
  );

drop policy if exists placements_customer_read on placements;
create policy placements_customer_read on placements
  for select using (customer_user_id = auth.uid());

drop policy if exists placements_driver_read on placements;
create policy placements_driver_read on placements
  for select using (
    driver_id in (select id from driver_profiles where user_id = auth.uid())
  );

drop policy if exists placements_admin_all on placements;
create policy placements_admin_all on placements
  for all using (
    exists (
      select 1 from user_roles
      where user_id = auth.uid()
        and role in ('admin_support', 'admin_verifier', 'super_admin')
    )
  );

commit;
