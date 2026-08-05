import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Check } from 'lucide-react';
import { getAuthUser } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { AdminSectionLabel } from '@/components/avanti/admin/page-header';
import { Portrait } from '@/components/avanti/portrait';
import { TierBadge, type TierLevel } from '@/components/avanti/tier-badge';
import { StampBadge } from '@/components/avanti/stamp-badge';
import {
  monthlySalaryForTier,
  placementFeeForTier,
  positionNameForTier,
  formatNaira,
} from '@/lib/permanent/salary';
import { HireForm } from './hire-form';

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

export default async function PermanentDossierPage({
  params,
}: {
  params: Promise<{ driverId: string }>;
}) {
  const { driverId } = await params;

  const user = await getAuthUser();
  if (!user) redirect('/sign-in');

  const admin = createServiceRoleClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (admin as any)
    .from('driver_profiles')
    .select(
      'id, user_id, verification_tier, verification_status, years_experience, bio, languages, vehicle_class_experience, transmission_experience, service_radius_km, available_permanent, suspended, deleted_at, average_rating, total_ratings, completed_jobs'
    )
    .eq('id', driverId)
    .single();

  if (
    !profile ||
    !profile.available_permanent ||
    profile.verification_status !== 'approved' ||
    profile.suspended ||
    profile.deleted_at
  ) {
    notFound();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: driverUser } = await (admin as any)
    .from('users')
    .select('full_name')
    .eq('id', profile.user_id)
    .single();

  // Customer's own contact info to pre-fill the hire form
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: customerUser } = await (admin as any)
    .from('users')
    .select('full_name, phone, email')
    .eq('id', user.id)
    .single();

  const tier = profile.verification_tier as TierLevel;
  const name = driverUser?.full_name ?? 'Driver';
  const firstName = name.split(' ')[0];
  const salary = monthlySalaryForTier(tier);
  const placementFee = placementFeeForTier(tier);

  return (
    <div className="mx-auto max-w-5xl px-6 pt-8 pb-20">
        <Link
          href="/customer/permanent"
          className="mb-8 inline-flex items-center gap-1.5 font-body text-[13px] text-admin-text-muted transition-colors hover:text-admin-text"
        >
          <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2} />
          All permanent drivers
        </Link>

        {/* Hero */}
        <div className="mb-12 grid gap-10 md:grid-cols-5 md:gap-12">
          <div className="md:col-span-2">
            <div className="flex justify-center md:block">
              <Portrait initials={initialsOf(name)} size="xxl" tier={tier} variant="square" />
            </div>
          </div>

          <div className="md:col-span-3 md:pt-4">
            <div className="mb-3 inline-flex items-center rounded-full bg-admin-green-soft px-2.5 py-1 font-body text-[11px] font-medium uppercase tracking-wide text-admin-green-text">
              Available for permanent placement
            </div>
            <h1 className="font-display text-5xl font-semibold leading-[1.05] tracking-tight text-admin-text md:text-6xl">
              {name}
            </h1>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <TierBadge tier={tier} label="long" size="lg" />
              <span className="font-body text-[12px] font-medium uppercase tracking-wide text-admin-text-muted">
                {positionNameForTier(tier)}
              </span>
            </div>

            <div className="mt-8 rounded-2xl border border-admin-border bg-admin-card p-6 shadow-admin">
              <div className="font-body text-[11px] font-medium uppercase tracking-wide text-admin-text-muted">
                Monthly salary
              </div>
              <div className="mt-2 font-display text-4xl font-semibold leading-none tabular-nums tracking-tight text-admin-text">
                {formatNaira(salary)}
              </div>
              <div className="mt-2 font-body text-[12px] text-admin-text-muted">
                Set by Avanti · Placement fee{' '}
                <span className="font-medium tabular-nums text-admin-text">
                  {formatNaira(placementFee)}
                </span>{' '}
                (incl. VAT) at contract start
              </div>
            </div>
          </div>
        </div>

        {/* Pull quote */}
        {profile.bio && (
          <div className="mb-12 rounded-2xl border border-admin-border border-l-4 border-l-admin-green bg-admin-card px-8 py-8 shadow-admin-sm">
            <div className="mb-3 font-body text-[11px] font-medium uppercase tracking-wide text-admin-green-text">
              In their own words
            </div>
            <blockquote className="max-w-3xl font-display text-2xl leading-relaxed text-admin-text md:text-3xl">
              &ldquo;{profile.bio}&rdquo;
            </blockquote>
          </div>
        )}

        {/* Credentials band */}
        <div className="mb-12">
          <AdminSectionLabel>Verified credentials</AdminSectionLabel>
          <div className="mt-4 flex flex-wrap gap-3">
            <StampBadge label="Identity confirmed" />
            <StampBadge label="Licence verified" />
            {['t2', 't3', 't4'].includes(tier) && <StampBadge label="Address verified" />}
            {['t2', 't3', 't4'].includes(tier) && <StampBadge label="Background checked" />}
            {['t3', 't4'].includes(tier) && <StampBadge label="Professional tier" />}
            {tier === 't4' && <StampBadge label="Executive certified" variant="filled" />}
          </div>
        </div>

        {/* Details */}
        <div className="mb-12 grid gap-8 md:grid-cols-2">
          <div className="rounded-2xl border border-admin-border bg-admin-card p-6 shadow-admin-sm">
            <AdminSectionLabel>Experience</AdminSectionLabel>
            <div className="mt-5 space-y-6">
              {(profile.years_experience ?? 0) > 0 && (
                <div>
                  <div className="font-display text-4xl font-semibold tabular-nums tracking-tight text-admin-text">
                    {profile.years_experience}
                    <span className="ml-2 font-body text-sm font-medium uppercase tracking-wide text-admin-text-muted">
                      years
                    </span>
                  </div>
                  <div className="mt-1 font-body text-sm text-admin-text-muted">
                    Professional driving experience
                  </div>
                </div>
              )}
              {(profile.vehicle_class_experience ?? []).length > 0 && (
                <div>
                  <div className="mb-2 font-body text-[11px] font-medium uppercase tracking-wide text-admin-text-muted">
                    Vehicle classes
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(profile.vehicle_class_experience ?? []).map((v: string) => (
                      <span
                        key={v}
                        className="rounded-lg bg-admin-bg px-3 py-1 font-body text-sm capitalize text-admin-text"
                      >
                        {v}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-admin-border bg-admin-card p-6 shadow-admin-sm">
            <AdminSectionLabel>What&apos;s included</AdminSectionLabel>
            <ul className="mt-5 space-y-2.5 font-body text-sm text-admin-text">
              {[
                'Monthly salary at the amount shown',
                'Placement fee paid once, at contract start',
                "Replacement guarantee if the fit isn't right",
                'Direct working relationship with the driver',
                'Payroll and compliance handled by Avanti',
                'You brief them, they work for you',
              ].map((line) => (
                <li key={line} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-admin-green-text" strokeWidth={2.5} />
                  <span>{line}</span>
                </li>
              ))}
            </ul>

            {(profile.languages ?? []).length > 0 && (
              <div className="mt-6">
                <div className="mb-2 font-body text-[11px] font-medium uppercase tracking-wide text-admin-text-muted">
                  Languages spoken
                </div>
                <div className="flex flex-wrap gap-2">
                  {(profile.languages ?? []).map((l: string) => (
                    <span
                      key={l}
                      className="rounded-lg bg-admin-bg px-3 py-1 font-body text-sm text-admin-text"
                    >
                      {l}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Hire form */}
        <div id="hire" className="border-t border-admin-border pt-12">
          <div className="mb-6">
            <AdminSectionLabel>Enquire</AdminSectionLabel>
            <h2 className="mt-2 font-display text-3xl font-semibold leading-tight tracking-tight text-admin-text md:text-4xl">
              Hire {firstName} as your permanent driver.
            </h2>
            <p className="mt-3 max-w-2xl font-body text-admin-text-muted">
              Send us a short brief. We&apos;ll confirm {firstName}&apos;s availability,
              introduce you both, and sort the contract from there.
            </p>
          </div>

          <HireForm
            driverId={driverId}
            driverFirstName={firstName}
            defaultContact={customerUser?.phone ? `+${customerUser.phone}` : (customerUser?.email ?? '')}
          />
        </div>
    </div>
  );
}
