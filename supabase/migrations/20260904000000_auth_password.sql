-- ============================================================================
-- Password auth support.
--
-- Accounts are still created via email OTP (which verifies the address). We now
-- also let users set a password for fast sign-in. Supabase Auth stores the
-- password hash in auth.users; we keep a lightweight flag in public.users so
-- the app can tell whether a user has a password yet (to prompt existing users
-- and to decide which sign-in method to encourage).
-- ============================================================================

begin;

alter table users
  add column if not exists has_password boolean not null default false;

commit;
