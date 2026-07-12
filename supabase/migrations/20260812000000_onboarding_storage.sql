-- ============================================================================
-- Onboarding + Storage
--
-- 1. Adds driver_profiles.onboarding_state for the wizard's draft data.
-- 2. Creates the driver-documents Storage bucket (private).
-- 3. RLS: drivers can upload/read their own docs; admin_verifier +
--    admin_compliance + super_admin can read all.
-- ============================================================================

alter table driver_profiles
  add column if not exists onboarding_state jsonb not null default '{}'::jsonb,
  add column if not exists onboarding_submitted_at timestamptz;

-- Create the storage bucket (private by default)
insert into storage.buckets (id, name, public, file_size_limit)
values ('driver-documents', 'driver-documents', false, 10485760) -- 10 MB
on conflict (id) do nothing;

-- ---- Storage RLS policies ---------------------------------------------
-- Path convention: driver-documents/{user_id}/{document_kind}/{filename}

-- Driver can INSERT (upload) their own docs
create policy driver_upload_own_docs on storage.objects for insert
  with check (
    bucket_id = 'driver-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Driver can SELECT their own docs
create policy driver_read_own_docs on storage.objects for select
  using (
    bucket_id = 'driver-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Driver can DELETE their own docs (to replace)
create policy driver_delete_own_docs on storage.objects for delete
  using (
    bucket_id = 'driver-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Verifiers + compliance + super_admin can SELECT any driver-documents file
create policy verifiers_read_all_docs on storage.objects for select
  using (
    bucket_id = 'driver-documents'
    and (
      auth_role_has('admin_verifier')
      or auth_role_has('admin_compliance')
      or auth_role_has('super_admin')
    )
  );
