-- ============================================================================
-- Inter-city / out-of-state trip requests.
--
-- Deliberately NOT a pricing engine. Customers describe a specific trip via a
-- detailed form; the request lands in an admin queue; ops matches a driver and
-- sets the price + conditions by hand (no rate card, no corridors). On send,
-- ops raises an invoice (Paystack link + bank transfer) emailed to the client.
--
-- Same shape/RLS conventions as placement_enquiries (see permanent_placements
-- migration). One table holds the whole lifecycle: request -> offer -> invoice
-- -> paid. Status drives the flow.
-- ============================================================================

begin;

create table if not exists trip_requests (
  id uuid primary key default gen_random_uuid(),
  customer_user_id uuid not null references public.users(id),

  -- ── The trip ──
  trip_type text not null default 'round_trip'
    check (trip_type in ('round_trip', 'one_way')),
  origin_city text not null,
  destinations text[] not null,                 -- one or more, in order
  departure_at timestamptz not null,
  return_at timestamptz,                         -- null for one_way
  days int check (days is null or days > 0),
  nights int not null default 0 check (nights >= 0),

  -- ── Vehicle & driving (customer's own vehicle) ──
  vehicle_description text not null,             -- make / model
  vehicle_class text not null,                   -- sedan / suv / executive / van / pickup
  transmission text not null default 'automatic'
    check (transmission in ('automatic', 'manual')),
  passengers int not null default 1 check (passengers >= 0),
  daily_usage text,                              -- how the driver is used each day (optional)
  accommodation text not null default 'customer_arranges'
    check (accommodation in ('customer_arranges', 'include_in_price')),

  -- ── Requirements ──
  tier_preference text
    check (tier_preference is null or tier_preference in ('standard', 'professional', 'executive')),
  special_requirements text,
  purpose text,

  -- ── Logistics & contact ──
  pickup_address text not null,
  notes text,
  contact_method text not null default 'whatsapp'
    check (contact_method in ('whatsapp', 'email', 'phone')),
  contact_detail text not null,

  -- ── Lifecycle ──
  status text not null default 'new'
    check (status in ('new', 'reviewing', 'quoted', 'accepted', 'paid', 'declined', 'closed')),

  -- ── Ops offer (set by hand on the admin dashboard) ──
  assigned_driver_id uuid references driver_profiles(id),
  offer_price numeric(12,2) check (offer_price is null or offer_price >= 0),
  offer_currency text not null default 'NGN',
  offer_conditions text,                         -- shown to the customer
  admin_notes text,                              -- internal only
  quoted_by uuid references public.users(id),
  quoted_at timestamptz,

  -- ── Invoice / payment ──
  payment_reference text,                        -- Paystack reference (unique when set)
  payment_link text,                             -- Paystack authorization_url
  payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'paid', 'manual_paid')),
  invoice_sent_at timestamptz,
  paid_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_trip_requests_status
  on trip_requests(status, created_at desc);
create index if not exists idx_trip_requests_customer
  on trip_requests(customer_user_id);
create index if not exists idx_trip_requests_driver
  on trip_requests(assigned_driver_id);
create unique index if not exists uniq_trip_requests_payment_reference
  on trip_requests(payment_reference) where payment_reference is not null;

alter table trip_requests enable row level security;

-- Customer: read + create their own requests only.
drop policy if exists trip_requests_customer_read on trip_requests;
create policy trip_requests_customer_read on trip_requests
  for select using (customer_user_id = auth.uid());

drop policy if exists trip_requests_customer_insert on trip_requests;
create policy trip_requests_customer_insert on trip_requests
  for insert with check (customer_user_id = auth.uid());

-- Admin: full access. Support/verifier match drivers; finance handles invoicing.
drop policy if exists trip_requests_admin_all on trip_requests;
create policy trip_requests_admin_all on trip_requests
  for all using (
    exists (
      select 1 from user_roles
      where user_id = auth.uid()
        and role in ('admin_support', 'admin_verifier', 'admin_finance', 'super_admin')
    )
  );

commit;
