-- ============================================================================
-- Contracts — application support.
--
-- 1. Allow standalone (non-engagement) contracts, e.g. a driver's post-onboarding
--    services contract: engagement_id + price_quote_hash become nullable, and a
--    subject_user_id anchors the contract to a person instead of an engagement.
-- 2. Next-of-kin on driver_profiles (protected like NIN; never shown to customers).
-- 3. Enable RLS on contracts/signatures (were unprotected); app writes via
--    service role, these policies are owner/admin read defence-in-depth.
-- ============================================================================

begin;

alter table contracts
  alter column engagement_id drop not null,
  alter column price_quote_hash drop not null,
  add column if not exists subject_user_id uuid references users(id);

-- One standalone contract per (subject, kind, version) when not engagement-bound.
create unique index if not exists uniq_subject_kind_version
  on contracts (subject_user_id, kind, version)
  where engagement_id is null and subject_user_id is not null;

create index if not exists idx_contracts_subject on contracts (subject_user_id) where subject_user_id is not null;

alter table driver_profiles
  add column if not exists next_of_kin_name text,
  add column if not exists next_of_kin_phone text,
  add column if not exists next_of_kin_relationship text;

-- ---- RLS ----
alter table contracts enable row level security;
alter table signatures enable row level security;

drop policy if exists contracts_read on contracts;
create policy contracts_read on contracts for select using (
  subject_user_id = auth.uid()
  or exists (select 1 from engagements e where e.id = contracts.engagement_id and e.customer_user_id = auth.uid())
  or exists (
    select 1 from engagements e join driver_profiles dp on dp.id = e.driver_id
    where e.id = contracts.engagement_id and dp.user_id = auth.uid()
  )
  or auth_role_has('admin_support') or auth_role_has('admin_finance')
  or auth_role_has('admin_compliance') or auth_role_has('super_admin')
);

drop policy if exists signatures_read on signatures;
create policy signatures_read on signatures for select using (
  signatory_id = auth.uid()
  or auth_role_has('admin_support') or auth_role_has('admin_compliance') or auth_role_has('super_admin')
);

commit;
