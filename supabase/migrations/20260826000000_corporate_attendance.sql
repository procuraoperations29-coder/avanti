-- ============================================================================
-- Corporate staffing — Phase 2: attendance + overtime.
--
-- Attendance: the driver signs in AND out each working day. A day only counts
-- (billable + payable) when BOTH are recorded (status 'present'). Days with no
-- record, or only one half, don't count.
--
-- Overtime: the driver logs it manually; the org's corporate_admin approves it
-- before it's billed/paid (anti-rigging). Avanti takes no cut — the amount is
-- hours x the assignment's overtime_hourly_rate, computed at invoice time.
-- ============================================================================

begin;

create table if not exists corporate_attendance (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references corporate_assignments(id) on delete cascade,
  driver_id uuid not null references driver_profiles(id),
  organization_id uuid not null references organizations(id) on delete cascade,
  work_date date not null,
  sign_in_at timestamptz,
  sign_out_at timestamptz,
  status text not null default 'signed_in'
    check (status in ('signed_in', 'present', 'absent', 'not_provided')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uniq_attendance_per_day unique (assignment_id, work_date)
);
create index if not exists idx_corp_attendance_org_date on corporate_attendance(organization_id, work_date desc);
create index if not exists idx_corp_attendance_driver on corporate_attendance(driver_id, work_date desc);

create table if not exists corporate_overtime (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references corporate_assignments(id) on delete cascade,
  driver_id uuid not null references driver_profiles(id),
  organization_id uuid not null references organizations(id) on delete cascade,
  work_date date not null,
  hours numeric(5,2) not null check (hours > 0 and hours <= 24),
  note text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references public.users(id),
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_corp_overtime_org_status on corporate_overtime(organization_id, status, work_date desc);
create index if not exists idx_corp_overtime_driver on corporate_overtime(driver_id, work_date desc);

alter table corporate_attendance enable row level security;
alter table corporate_overtime enable row level security;

-- Attendance: assigned driver manages their own; org members read; admin all.
drop policy if exists corp_attendance_driver_all on corporate_attendance;
create policy corp_attendance_driver_all on corporate_attendance
  for all using (
    exists (select 1 from driver_profiles dp where dp.id = corporate_attendance.driver_id and dp.user_id = auth.uid())
  )
  with check (
    exists (select 1 from driver_profiles dp where dp.id = corporate_attendance.driver_id and dp.user_id = auth.uid())
  );
drop policy if exists corp_attendance_member_read on corporate_attendance;
create policy corp_attendance_member_read on corporate_attendance
  for select using (
    exists (select 1 from user_roles ur where ur.user_id = auth.uid()
      and ur.organization_id = corporate_attendance.organization_id
      and ur.role in ('corporate_admin','corporate_member') and ur.revoked_at is null)
  );
drop policy if exists corp_attendance_admin_all on corporate_attendance;
create policy corp_attendance_admin_all on corporate_attendance
  for all using (
    exists (select 1 from user_roles where user_id = auth.uid()
      and role in ('admin_support','admin_verifier','admin_finance','super_admin'))
  );

-- Overtime: driver creates/reads own; org members read; corporate_admin approves; admin all.
drop policy if exists corp_overtime_driver_rw on corporate_overtime;
create policy corp_overtime_driver_rw on corporate_overtime
  for all using (
    exists (select 1 from driver_profiles dp where dp.id = corporate_overtime.driver_id and dp.user_id = auth.uid())
  )
  with check (
    exists (select 1 from driver_profiles dp where dp.id = corporate_overtime.driver_id and dp.user_id = auth.uid())
  );
drop policy if exists corp_overtime_member_read on corporate_overtime;
create policy corp_overtime_member_read on corporate_overtime
  for select using (
    exists (select 1 from user_roles ur where ur.user_id = auth.uid()
      and ur.organization_id = corporate_overtime.organization_id
      and ur.role in ('corporate_admin','corporate_member') and ur.revoked_at is null)
  );
drop policy if exists corp_overtime_admin_all on corporate_overtime;
create policy corp_overtime_admin_all on corporate_overtime
  for all using (
    exists (select 1 from user_roles where user_id = auth.uid()
      and role in ('admin_support','admin_verifier','admin_finance','super_admin'))
  );

commit;
