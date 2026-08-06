-- ============================================================================
-- Sanctions / watchlist screening records + re-check scheduling.
--
-- One row per screened subject (a user, usually a driver). A check has a status
-- and a `next_check_due`; the daily cron flags overdue checks as 'needs_review'
-- so compliance re-screens them. Actual provider screening is recorded by
-- compliance via the admin UI.
-- ============================================================================

begin;

create table if not exists sanctions_checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  driver_id uuid references driver_profiles(id) on delete set null,
  provider text not null default 'manual',
  status text not null default 'pending'
    check (status in ('pending', 'clear', 'hit', 'needs_review')),
  result jsonb not null default '{}',
  checked_at timestamptz,
  next_check_due timestamptz,
  notes text,
  created_by uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_sanctions_status_due on sanctions_checks (status, next_check_due);
create index if not exists idx_sanctions_user on sanctions_checks (user_id);
create unique index if not exists uniq_sanctions_active_per_user on sanctions_checks (user_id);

alter table sanctions_checks enable row level security;

drop policy if exists sanctions_admin_all on sanctions_checks;
create policy sanctions_admin_all on sanctions_checks
  for all using (
    exists (select 1 from user_roles where user_id = auth.uid()
      and role in ('admin_compliance', 'admin_support', 'admin_verifier', 'super_admin')
      and revoked_at is null)
  );

commit;
