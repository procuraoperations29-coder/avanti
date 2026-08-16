-- ============================================================================
-- Marketing — first-party page-view analytics.
--
-- Lightweight, privacy-preserving: an anonymous visitor id (random, stored
-- client-side), the path, referrer, and UTM tags. No personal data in the row
-- beyond an optional user_id when the visitor is signed in. Inserted via the
-- service role from /api/track/pageview; admins read for the marketing dashboard.
-- ============================================================================

begin;

create table if not exists page_views (
  id uuid primary key default gen_random_uuid(),
  path text not null,
  referrer text,
  referrer_host text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  visitor_id text,
  user_id uuid references users(id) on delete set null,
  is_signed_in boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_page_views_created on page_views (created_at desc);
create index if not exists idx_page_views_path on page_views (path, created_at desc);
create index if not exists idx_page_views_utm on page_views (utm_source, created_at desc) where utm_source is not null;

alter table page_views enable row level security;

drop policy if exists page_views_admin_read on page_views;
create policy page_views_admin_read on page_views for select using (
  auth_role_has('admin_support') or auth_role_has('admin_finance') or auth_role_has('super_admin')
);

commit;
