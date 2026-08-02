-- ============================================================================
-- Corporate dedicated-driver staffing — Phase 1 (roster).
--
-- An organisation requests N drivers; Avanti assigns specific drivers at a
-- rate ops sets per assignment. Later phases add daily attendance, manual
-- overtime (corporate_admin approves), and monthly invoicing.
--
-- Money model (org never sees driver pay — same isolation as trips/placements):
--   daily_rate         — what the ORG pays Avanti per day worked
--   driver_daily_pay   — what AVANTI pays the driver per day (margin = the gap)
--   overtime_hourly_rate — pass-through: org pays == driver gets (no Avanti cut)
-- ============================================================================

begin;

-- Invoice due day chosen at signup (day of month, capped so it exists monthly).
alter table organizations
  add column if not exists billing_day int
    check (billing_day is null or (billing_day >= 1 and billing_day <= 28));

-- Organisation asks for drivers.
create table if not exists corporate_driver_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  requested_by_user_id uuid not null references public.users(id),
  number_of_drivers int not null check (number_of_drivers > 0),
  requirements text not null,
  preferred_start_date date,
  status text not null default 'new'
    check (status in ('new', 'reviewing', 'partially_fulfilled', 'fulfilled', 'declined', 'closed')),
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_corp_requests_org on corporate_driver_requests(organization_id, created_at desc);
create index if not exists idx_corp_requests_status on corporate_driver_requests(status, created_at desc);

-- A driver placed at an organisation.
create table if not exists corporate_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  driver_id uuid not null references driver_profiles(id),
  request_id uuid references corporate_driver_requests(id),

  daily_rate numeric(12,2) not null check (daily_rate >= 0),          -- org pays Avanti / day
  driver_daily_pay numeric(12,2) not null default 0 check (driver_daily_pay >= 0), -- Avanti pays driver / day
  overtime_hourly_rate numeric(12,2) not null default 0 check (overtime_hourly_rate >= 0),
  currency text not null default 'NGN',
  position_title text,

  start_date date not null,
  end_date date,
  status text not null default 'active'
    check (status in ('active', 'ended', 'replaced')),
  end_reason text,
  -- Replacement chain: this assignment replaces / is replaced by another.
  replaces_assignment_id uuid references corporate_assignments(id),
  replaced_by_assignment_id uuid references corporate_assignments(id),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint corp_assignment_pay_lte_rate check (driver_daily_pay <= daily_rate)
);
create index if not exists idx_corp_assignments_org on corporate_assignments(organization_id, status);
create index if not exists idx_corp_assignments_driver on corporate_assignments(driver_id, status);

-- ── RLS ──
alter table corporate_driver_requests enable row level security;
alter table corporate_assignments enable row level security;

-- Helper predicate: caller is a member of the org.
--   (inlined per-policy; no function to keep this migration self-contained)

-- Requests: org members read/create their own; admin all.
drop policy if exists corp_requests_member_read on corporate_driver_requests;
create policy corp_requests_member_read on corporate_driver_requests
  for select using (
    exists (
      select 1 from user_roles ur
      where ur.user_id = auth.uid() and ur.organization_id = corporate_driver_requests.organization_id
        and ur.role in ('corporate_admin', 'corporate_member') and ur.revoked_at is null
    )
  );
drop policy if exists corp_requests_member_insert on corporate_driver_requests;
create policy corp_requests_member_insert on corporate_driver_requests
  for insert with check (
    exists (
      select 1 from user_roles ur
      where ur.user_id = auth.uid() and ur.organization_id = corporate_driver_requests.organization_id
        and ur.role in ('corporate_admin', 'corporate_member') and ur.revoked_at is null
    )
  );
drop policy if exists corp_requests_admin_all on corporate_driver_requests;
create policy corp_requests_admin_all on corporate_driver_requests
  for all using (
    exists (select 1 from user_roles where user_id = auth.uid()
      and role in ('admin_support','admin_verifier','admin_finance','super_admin'))
  );

-- Assignments: org members read their org's; the assigned driver reads their own; admin all.
drop policy if exists corp_assignments_member_read on corporate_assignments;
create policy corp_assignments_member_read on corporate_assignments
  for select using (
    exists (
      select 1 from user_roles ur
      where ur.user_id = auth.uid() and ur.organization_id = corporate_assignments.organization_id
        and ur.role in ('corporate_admin', 'corporate_member') and ur.revoked_at is null
    )
  );
drop policy if exists corp_assignments_driver_read on corporate_assignments;
create policy corp_assignments_driver_read on corporate_assignments
  for select using (
    exists (select 1 from driver_profiles dp where dp.id = corporate_assignments.driver_id and dp.user_id = auth.uid())
  );
drop policy if exists corp_assignments_admin_all on corporate_assignments;
create policy corp_assignments_admin_all on corporate_assignments
  for all using (
    exists (select 1 from user_roles where user_id = auth.uid()
      and role in ('admin_support','admin_verifier','admin_finance','super_admin'))
  );

commit;
