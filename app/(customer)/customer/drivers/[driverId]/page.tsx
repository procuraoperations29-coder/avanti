import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Star, ArrowRight, Check } from 'lucide-react';
import { getAuthUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { getDriverSelfieUrl } from '@/lib/storage/upload';
import { AdminSectionLabel } from '@/components/avanti/admin/page-header';
import { Portrait } from '@/components/avanti/portrait';
import { TierBadge, type TierLevel } from '@/components/avanti/tier-badge';
import { StampBadge } from '@/components/avanti/stamp-badge';
import { Button } from '@/components/ui/button';

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

/**
 * Driver dossier — editorial magazine layout.
 *
 * Design philosophy: this page IS the sales moment. It should feel less
 * like a spec sheet, more like a Kinfolk feature on a specific person.
 * Large portrait, editorial pull-quote from bio, credentials as
 * prominent stamps, details in a two-column grid, then a considered
 * book CTA.
 *
 * Info isolation: reads v_public_driver_summary only — no exposure of
 * private driver data (payout amounts, home address, etc.).
 */

export default async function DriverDossierPage({
  params,
}: {
  params: Promise<{ driverId: string }>;
}) {
  const { driverId } = await params;

  const user = await getAuthUser();
  if (!user) redirect('/sign-in');

  const supabase = await createClient();
  const { data: driver } = await supabase
    .from('v_public_driver_summary')
    .select('*')
    .eq('driver_id', driverId)
    .single();

  if (!driver) notFound();

  const tier = (driver.verification_tier ?? 't1') as TierLevel;
  const initials = initialsOf(driver.full_name ?? 'Driver');
  const firstName = (driver.full_name ?? 'Driver').split(' ')[0];
  const selfieUrl = driver.user_id ? await getDriverSelfieUrl(driver.user_id) : null;

  return (
    <div className="mx-auto max-w-5xl px-6 pt-8 pb-20">
        {/* Back link */}
        <Link
          href="/customer/search"
          className="mb-8 inline-flex items-center gap-1.5 font-body text-[13px] text-admin-text-muted transition-colors hover:text-admin-text"
        >
          <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2} />
          Return to search
        </Link>

        {/* ─────────── HERO ─────────── */}
        <div className="mb-12 grid gap-10 rounded-2xl border border-admin-border bg-admin-card p-6 shadow-admin md:grid-cols-5 md:gap-12 md:p-8">
          {/* Portrait column */}
          <div className="md:col-span-2">
            <div className="flex justify-center md:block">
              <Portrait
                initials={initials}
                imageUrl={selfieUrl}
                imageAlt={driver.full_name ?? 'Driver'}
                size="xxl"
                tier={tier}
                variant="square"
              />
            </div>

            {/* Ratings under portrait — subtle */}
            {driver.average_rating != null && (driver.total_ratings ?? 0) > 0 && (
              <div className="mt-6 flex items-center justify-center gap-1.5 font-body text-[13px] text-admin-text md:justify-start">
                <Star className="h-3.5 w-3.5 fill-admin-amber text-admin-amber" strokeWidth={0} />
                <span className="font-medium tabular-nums text-admin-text">
                  {driver.average_rating.toFixed(1)}
                </span>
                <span className="text-admin-text-muted">
                  · {driver.total_ratings} rating{driver.total_ratings === 1 ? '' : 's'}
                </span>
              </div>
            )}
          </div>

          {/* Copy column */}
          <div className="md:col-span-3 md:pt-4">
            <div className="mb-4 font-body text-[11px] font-medium uppercase tracking-wide text-admin-text-muted">
              Verified professional driver · Est. Lagos
            </div>
            <h1 className="font-display text-5xl font-semibold leading-[1.05] tracking-tight text-admin-text md:text-6xl">
              {driver.full_name}
            </h1>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <TierBadge tier={tier} label="long" size="lg" />
              {(driver.completed_jobs ?? 0) > 0 && (
                <div className="font-body text-[13px] text-admin-text-muted">
                  <span className="font-medium tabular-nums text-admin-text">
                    {driver.completed_jobs}
                  </span>{' '}
                  completed engagements
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ─────────── PULL QUOTE FROM BIO ─────────── */}
        {driver.bio && (
          <div className="mb-12 rounded-2xl border border-admin-border border-l-4 border-l-admin-green bg-admin-card px-8 py-10 shadow-admin-sm">
            <div className="mb-3 font-body text-[11px] font-medium uppercase tracking-wide text-admin-green-text">
              In their own words
            </div>
            <blockquote className="max-w-3xl font-display text-2xl font-semibold leading-relaxed tracking-tight text-admin-text md:text-3xl">
              &ldquo;{driver.bio}&rdquo;
            </blockquote>
          </div>
        )}

        {/* ─────────── CREDENTIALS BAND ─────────── */}
        <div className="mb-12 rounded-2xl border border-admin-border bg-admin-card p-6 shadow-admin-sm md:p-8">
          <AdminSectionLabel>Verified credentials</AdminSectionLabel>
          <div className="mt-4 flex flex-wrap gap-3">
            <StampBadge label="Identity confirmed" />
            <StampBadge label="Licence verified" />
            {['t2', 't3', 't4'].includes(tier) && <StampBadge label="Address verified" />}
            {['t2', 't3', 't4'].includes(tier) && <StampBadge label="Background checked" />}
            {['t3', 't4'].includes(tier) && <StampBadge label="Professional tier" />}
            {tier === 't4' && <StampBadge label="Executive certified" variant="filled" />}
          </div>
          <p className="mt-6 max-w-2xl font-body text-sm leading-relaxed text-admin-text-muted">
            {firstName} was reviewed personally by our verification team. Each stamp
            represents a document verified or a check completed — no algorithmic
            assessments, no self-service approvals.
          </p>
        </div>

        {/* ─────────── DETAILS GRID ─────────── */}
        <div className="mb-12 grid gap-6 md:grid-cols-2">
          {/* Experience column */}
          <div className="rounded-2xl border border-admin-border bg-admin-card p-6 shadow-admin-sm md:p-8">
            <AdminSectionLabel>Experience</AdminSectionLabel>
            <div className="mt-6 space-y-6">
              {(driver.years_experience ?? 0) > 0 && (
                <div>
                  <div className="font-display text-5xl font-semibold tracking-tight text-admin-text">
                    <span className="tabular-nums">{driver.years_experience}</span>
                    <span className="ml-2 font-body text-sm font-medium uppercase tracking-wide text-admin-text-muted">
                      years
                    </span>
                  </div>
                  <div className="mt-1 font-body text-sm text-admin-text-muted">
                    Professional driving experience
                  </div>
                </div>
              )}

              {(driver.vehicle_class_experience ?? []).length > 0 && (
                <div>
                  <div className="mb-2 font-body text-[11px] font-medium uppercase tracking-wide text-admin-text-muted">
                    Vehicle classes
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(driver.vehicle_class_experience ?? []).map((v) => (
                      <span
                        key={v}
                        className="inline-flex items-center rounded-lg bg-admin-bg px-3 py-1 font-body text-sm capitalize text-admin-text"
                      >
                        {v}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {(driver.transmission_experience ?? []).length > 0 && (
                <div>
                  <div className="mb-2 font-body text-[11px] font-medium uppercase tracking-wide text-admin-text-muted">
                    Transmissions
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(driver.transmission_experience ?? []).map((v) => (
                      <span
                        key={v}
                        className="inline-flex items-center rounded-lg bg-admin-bg px-3 py-1 font-body text-sm capitalize text-admin-text"
                      >
                        {v}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Service column */}
          <div className="rounded-2xl border border-admin-border bg-admin-card p-6 shadow-admin-sm md:p-8">
            <AdminSectionLabel>Service</AdminSectionLabel>
            <div className="mt-6 space-y-6">
              {(driver.languages ?? []).length > 0 && (
                <div>
                  <div className="mb-2 font-body text-[11px] font-medium uppercase tracking-wide text-admin-text-muted">
                    Languages spoken
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(driver.languages ?? []).map((l) => (
                      <span
                        key={l}
                        className="inline-flex items-center rounded-lg bg-admin-bg px-3 py-1 font-body text-sm text-admin-text"
                      >
                        {l}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {driver.service_radius_km && (
                <div>
                  <div className="font-display text-5xl font-semibold tracking-tight text-admin-text">
                    <span className="tabular-nums">{driver.service_radius_km}</span>
                    <span className="ml-2 font-body text-sm font-medium uppercase tracking-wide text-admin-text-muted">
                      km
                    </span>
                  </div>
                  <div className="mt-1 font-body text-sm text-admin-text-muted">
                    Willing to travel from home base
                  </div>
                </div>
              )}

              <div>
                <div className="mb-2 font-body text-[11px] font-medium uppercase tracking-wide text-admin-text-muted">
                  What you get
                </div>
                <ul className="space-y-2 font-body text-sm text-admin-text">
                  {[
                    'Transparent, published rate card',
                    'Direct contact with the driver',
                    'Rating and review after every engagement',
                    'Replacement guarantee for permanent placements',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <Check
                        className="mt-0.5 h-4 w-4 shrink-0 text-admin-green-text"
                        strokeWidth={2}
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* ─────────── BOOK CTA ─────────── */}
        <div className="rounded-2xl bg-gradient-to-br from-admin-navy to-admin-navy-2 p-10 text-center text-white shadow-admin md:p-16">
          <div className="mb-4 font-body text-[11px] font-medium uppercase tracking-wide text-white/60">
            Ready?
          </div>
          <h2 className="mx-auto max-w-2xl font-display text-3xl font-semibold leading-tight tracking-tight text-white md:text-5xl">
            Book {firstName} for your next engagement.
          </h2>
          <p className="mx-auto mt-6 max-w-lg font-body text-white/70">
            Configure your booking. See the price before you commit. Confirm when
            you&apos;re ready.
          </p>
          <div className="mt-10 flex justify-center">
            <Link href={`/customer/drivers/${driverId}/book`}>
              <Button
                size="lg"
                className="min-w-[240px] rounded-xl bg-admin-green text-admin-navy-2 shadow-admin-sm transition-colors hover:bg-admin-green/90"
              >
                Configure booking
                <ArrowRight className="ml-2 h-4 w-4" strokeWidth={1.5} />
              </Button>
            </Link>
          </div>
        </div>
    </div>
  );
}
