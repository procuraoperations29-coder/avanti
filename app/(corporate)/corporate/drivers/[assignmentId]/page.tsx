import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Star } from 'lucide-react';
import { getAuthUser } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { AdminSectionLabel, AdminSpecRow } from '@/components/avanti/admin/page-header';
import { Portrait } from '@/components/avanti/portrait';
import { TierBadge, type TierLevel } from '@/components/avanti/tier-badge';

function initialsOf(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('');
}
function formatNaira(n: number): string {
  return `₦${Math.round(n).toLocaleString('en-NG')}`;
}
function fmtDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default async function CorporateDriverDetailPage({ params }: { params: Promise<{ assignmentId: string }> }) {
  const user = await getAuthUser();
  if (!user) redirect('/sign-in');
  const orgId = user.activeOrganizationId;
  if (!orgId) redirect('/corporate');

  const { assignmentId } = await params;
  const admin = createServiceRoleClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: a } = await (admin as any)
    .from('corporate_assignments')
    .select('id, organization_id, driver_id, monthly_rate, currency, position_title, start_date, status')
    .eq('id', assignmentId)
    .single();
  if (!a || a.organization_id !== orgId) notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (admin as any)
    .from('driver_profiles')
    .select('user_id, verification_tier, years_experience, languages, vehicle_class_experience, transmission_experience, bio, average_rating, total_ratings, completed_jobs')
    .eq('id', a.driver_id)
    .single();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: du } = profile?.user_id
    ? await (admin as any).from('users').select('full_name, phone').eq('id', profile.user_id).single()
    : { data: null };

  const name = du?.full_name ?? 'Driver';
  const tier = (profile?.verification_tier as TierLevel) ?? 't1';

  return (
    <div className="mx-auto max-w-3xl px-4 pt-8 pb-20 sm:px-6">
      <Link
        href="/corporate"
        className="mb-6 inline-flex items-center gap-1.5 font-body text-[13px] text-admin-text-muted transition-colors hover:text-admin-text"
      >
        <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2} />
        Dashboard
      </Link>

      <div className="mb-8 flex items-start gap-4">
        <Portrait initials={initialsOf(name)} size="xl" tier={tier} />
        <div className="min-w-0 flex-1 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-3xl font-semibold tracking-tight text-admin-text">{name}</h1>
            <TierBadge tier={tier} />
            <span
              className={
                'inline-flex items-center rounded-full px-2 py-0.5 font-body text-[11px] font-medium uppercase tracking-wide ' +
                (a.status === 'active' ? 'bg-admin-green-soft text-admin-green-text' : 'bg-admin-amber-soft text-admin-amber-text')
              }
            >
              {a.status === 'active' ? 'Active' : 'Pending payment'}
            </span>
          </div>
          {a.position_title && <p className="mt-1 font-body text-[13px] text-admin-text-muted">{a.position_title}</p>}
          {profile?.average_rating != null && (profile.total_ratings ?? 0) > 0 && (
            <div className="mt-2 flex items-center gap-1.5 font-body text-[13px] text-admin-text-muted">
              <Star className="h-4 w-4 fill-admin-amber text-admin-amber" strokeWidth={0} />
              <span className="font-medium tabular-nums text-admin-text">{profile.average_rating.toFixed(1)}</span>
              <span>· {profile.total_ratings} rating{profile.total_ratings === 1 ? '' : 's'}</span>
            </div>
          )}
        </div>
      </div>

      {/* Pending activation */}
      {a.status === 'pending' && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-admin-amber/30 bg-admin-amber-soft px-5 py-4 shadow-admin-sm">
          <div className="font-body text-sm text-admin-text">
            <span className="font-medium">Awaiting activation.</span> This driver starts once the
            upfront invoice is paid.
          </div>
          <Link
            href="/corporate"
            className="inline-flex items-center rounded-xl bg-admin-green px-4 py-2 font-body text-sm font-medium text-admin-navy-2 shadow-admin-sm transition-all hover:brightness-95"
          >
            Go to payment
          </Link>
        </div>
      )}

      {profile?.bio && (
        <div className="mb-6 rounded-2xl border border-admin-border border-l-4 border-l-admin-green bg-admin-card px-6 py-6 shadow-admin-sm">
          <div className="mb-2 font-body text-[11px] font-medium uppercase tracking-wide text-admin-green-text">In their own words</div>
          <blockquote className="font-display text-xl leading-relaxed text-admin-text">&ldquo;{profile.bio}&rdquo;</blockquote>
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-2xl border border-admin-border bg-admin-card p-6 shadow-admin-sm">
          <AdminSectionLabel>Driver</AdminSectionLabel>
          <dl className="mt-3">
            <AdminSpecRow label="Phone" value={du?.phone ?? '—'} variant="mono" />
            <AdminSpecRow label="Experience" value={profile?.years_experience ? `${profile.years_experience} years` : '—'} />
            <AdminSpecRow label="Completed jobs" value={String(profile?.completed_jobs ?? 0)} variant="mono" />
            <AdminSpecRow label="Vehicle classes" value={(profile?.vehicle_class_experience ?? []).join(', ') || '—'} />
            <AdminSpecRow label="Transmission" value={(profile?.transmission_experience ?? []).join(', ') || '—'} />
            <AdminSpecRow label="Languages" value={(profile?.languages ?? []).join(', ') || '—'} />
          </dl>
        </div>

        <div className="rounded-2xl border border-admin-border bg-admin-card p-6 shadow-admin-sm">
          <AdminSectionLabel>Engagement</AdminSectionLabel>
          <dl className="mt-3">
            <AdminSpecRow label="Position" value={a.position_title ?? '—'} />
            <AdminSpecRow label="Monthly rate" value={formatNaira(Number(a.monthly_rate ?? 0))} variant="mono" />
            <AdminSpecRow label="Since" value={fmtDate(a.start_date)} variant="mono" />
            <AdminSpecRow label="Status" value={a.status === 'active' ? 'Active' : 'Pending payment'} />
          </dl>
        </div>
      </div>
    </div>
  );
}
