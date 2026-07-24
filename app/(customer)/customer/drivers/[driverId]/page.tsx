import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Star, ArrowRight, Check } from 'lucide-react';
import { getAuthUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { SectionLabel } from '@/components/avanti/section-label';
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

  return (
    <div className="mx-auto max-w-5xl px-6 pt-8 pb-20">
        {/* Back link */}
        <Link
          href="/customer/search"
          className="mb-8 inline-flex items-center gap-1 font-mono text-xs uppercase tracking-wider text-ink-muted hover:text-ink"
        >
          <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
          Return to search
        </Link>

        {/* ─────────── EDITORIAL HERO ─────────── */}
        <div className="mb-16 grid gap-10 md:grid-cols-5 md:gap-12">
          {/* Portrait column */}
          <div className="md:col-span-2">
            <div className="flex justify-center md:block">
              <Portrait
                initials={initials}
                size="xxl"
                tier={tier}
                variant="square"
              />
            </div>

            {/* Ratings under portrait — subtle */}
            {driver.average_rating != null && (driver.total_ratings ?? 0) > 0 && (
              <div className="mt-6 flex items-center justify-center gap-2 font-mono text-xs text-ink md:justify-start">
                <Star className="h-3.5 w-3.5 fill-brass text-brass" strokeWidth={0} />
                <span>{driver.average_rating.toFixed(1)}</span>
                <span className="text-ink-faint">·</span>
                <span className="text-ink-muted">
                  {driver.total_ratings} rating{driver.total_ratings === 1 ? '' : 's'}
                </span>
              </div>
            )}
          </div>

          {/* Copy column */}
          <div className="md:col-span-3 md:pt-4">
            <div className="mb-4 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
              Verified professional driver · Est. Lagos
            </div>
            <h1 className="font-display text-5xl leading-[1.05] text-ink md:text-6xl">
              {driver.full_name}
            </h1>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <TierBadge tier={tier} label="long" size="lg" />
              {(driver.completed_jobs ?? 0) > 0 && (
                <div className="font-mono text-xs uppercase tracking-wider text-ink-muted">
                  {driver.completed_jobs} completed engagements
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ─────────── PULL QUOTE FROM BIO ─────────── */}
        {driver.bio && (
          <div className="mb-16 border-l-2 border-brass bg-paper-2 px-8 py-10">
            <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-brass">
              In their own words
            </div>
            <blockquote className="max-w-3xl font-display text-2xl italic leading-relaxed text-ink md:text-3xl">
              &ldquo;{driver.bio}&rdquo;
            </blockquote>
          </div>
        )}

        {/* ─────────── CREDENTIALS BAND ─────────── */}
        <div className="mb-16 border-y border-line py-10">
          <SectionLabel>Verified credentials</SectionLabel>
          <div className="mt-4 flex flex-wrap gap-3">
            <StampBadge label="Identity confirmed" />
            <StampBadge label="Licence verified" />
            {['t2', 't3', 't4'].includes(tier) && <StampBadge label="Address verified" />}
            {['t2', 't3', 't4'].includes(tier) && <StampBadge label="Background checked" />}
            {['t3', 't4'].includes(tier) && <StampBadge label="Professional tier" />}
            {tier === 't4' && <StampBadge label="Executive certified" variant="filled" />}
          </div>
          <p className="mt-6 max-w-2xl font-body text-sm leading-relaxed text-ink-muted">
            {firstName} was reviewed personally by our verification team. Each stamp
            represents a document verified or a check completed — no algorithmic
            assessments, no self-service approvals.
          </p>
        </div>

        {/* ─────────── DETAILS GRID ─────────── */}
        <div className="mb-16 grid gap-12 md:grid-cols-2">
          {/* Experience column */}
          <div>
            <SectionLabel>Experience</SectionLabel>
            <div className="mt-6 space-y-6">
              {(driver.years_experience ?? 0) > 0 && (
                <div>
                  <div className="font-display text-5xl text-ink">
                    {driver.years_experience}
                    <span className="ml-2 font-mono text-sm uppercase tracking-wider text-ink-muted">
                      years
                    </span>
                  </div>
                  <div className="mt-1 font-body text-sm text-ink-muted">
                    Professional driving experience
                  </div>
                </div>
              )}

              {(driver.vehicle_class_experience ?? []).length > 0 && (
                <div>
                  <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                    Vehicle classes
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(driver.vehicle_class_experience ?? []).map((v) => (
                      <span
                        key={v}
                        className="border border-line-strong bg-paper-2 px-3 py-1 font-body text-sm capitalize text-ink"
                      >
                        {v}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {(driver.transmission_experience ?? []).length > 0 && (
                <div>
                  <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                    Transmissions
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(driver.transmission_experience ?? []).map((v) => (
                      <span
                        key={v}
                        className="border border-line-strong bg-paper-2 px-3 py-1 font-body text-sm capitalize text-ink"
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
          <div>
            <SectionLabel>Service</SectionLabel>
            <div className="mt-6 space-y-6">
              {(driver.languages ?? []).length > 0 && (
                <div>
                  <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                    Languages spoken
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(driver.languages ?? []).map((l) => (
                      <span
                        key={l}
                        className="border border-line-strong bg-paper-2 px-3 py-1 font-body text-sm text-ink"
                      >
                        {l}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {driver.service_radius_km && (
                <div>
                  <div className="font-display text-5xl text-ink">
                    {driver.service_radius_km}
                    <span className="ml-2 font-mono text-sm uppercase tracking-wider text-ink-muted">
                      km
                    </span>
                  </div>
                  <div className="mt-1 font-body text-sm text-ink-muted">
                    Willing to travel from home base
                  </div>
                </div>
              )}

              <div>
                <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                  What you get
                </div>
                <ul className="space-y-2 font-body text-sm text-ink">
                  {[
                    'Transparent, published rate card',
                    'Direct contact with the driver',
                    'Rating and review after every engagement',
                    'Replacement guarantee for permanent placements',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <Check
                        className="mt-0.5 h-4 w-4 shrink-0 text-brass"
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
        <div className="border-t-2 border-ink pt-12 text-center md:pt-16">
          <div className="mb-4 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
            Ready?
          </div>
          <h2 className="mx-auto max-w-2xl font-display text-3xl leading-tight text-ink md:text-5xl">
            Book <em className="italic">{firstName}</em> for your next engagement.
          </h2>
          <p className="mx-auto mt-6 max-w-lg font-body text-ink-muted">
            Configure your booking. See the price before you commit. Confirm when
            you&apos;re ready.
          </p>
          <div className="mt-10 flex justify-center">
            <Link href={`/customer/drivers/${driverId}/book`}>
              <Button size="lg" className="min-w-[240px]">
                Configure booking
                <ArrowRight className="ml-2 h-4 w-4" strokeWidth={1.5} />
              </Button>
            </Link>
          </div>
        </div>
    </div>
  );
}
