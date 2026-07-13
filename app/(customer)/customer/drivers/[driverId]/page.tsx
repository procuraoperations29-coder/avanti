import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Star } from 'lucide-react';
import { getAuthUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { SectionLabel } from '@/components/avanti/section-label';
import { SpecRow } from '@/components/avanti/spec-row';
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

export default async function DriverDossierPage({
  params,
}: {
  params: Promise<{ driverId: string }>;
}) {
  const { driverId } = await params;

  const user = await getAuthUser();
  if (!user) redirect('/sign-in');

  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: driver } = await (supabase as any)
    .from('v_public_driver_summary')
    .select('*')
    .eq('driver_id', driverId)
    .single();

  if (!driver) notFound();

  const tier = driver.verification_tier as TierLevel;

  return (
    <div className="mx-auto max-w-3xl px-4 pt-8 sm:px-6 pb-20">
      <Link
        href="/customer/search"
        className="mb-4 inline-flex items-center gap-1 font-mono text-xs uppercase tracking-wider text-ink-muted hover:text-ink"
      >
        <ChevronLeft className="h-3.5 w-3.5" /> Search
      </Link>

      {/* Header */}
      <div className="mb-8 flex flex-col items-start gap-6 sm:flex-row sm:items-center">
        <Portrait initials={initialsOf(driver.full_name)} size="xl" tier={tier} />
        <div className="flex-1">
          <SectionLabel>Driver</SectionLabel>
          <h1 className="mt-2 font-display text-4xl leading-tight text-ink">
            {driver.full_name}
          </h1>
          <div className="mt-3 flex items-center gap-3">
            <TierBadge tier={tier} label="long" />
            {driver.average_rating != null && (driver.total_ratings ?? 0) > 0 && (
              <div className="flex items-center gap-1 font-mono text-sm text-ink">
                <Star className="h-3.5 w-3.5 fill-brass text-brass" strokeWidth={0} />
                {driver.average_rating.toFixed(1)}
                <span className="text-ink-faint"> · {driver.total_ratings}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bio */}
      {driver.bio && (
        <div className="mb-8">
          <SectionLabel>About</SectionLabel>
          <p className="mt-3 font-body leading-relaxed text-ink">{driver.bio}</p>
        </div>
      )}

      {/* Credentials */}
      <div className="mb-8">
        <SectionLabel>Credentials</SectionLabel>
        <div className="mt-3 flex flex-wrap gap-2">
          <StampBadge label="Identity verified" />
          {['t2', 't3', 't4'].includes(tier) && <StampBadge label="Background checked" />}
          {['t3', 't4'].includes(tier) && <StampBadge label="Professional tier" />}
          {tier === 't4' && <StampBadge label="Executive certified" variant="filled" />}
        </div>
      </div>

      {/* Spec */}
      <div className="mb-8">
        <SectionLabel>Details</SectionLabel>
        <dl className="mt-3">
          <SpecRow label="Years driving" value={driver.years_experience ?? '—'} />
          <SpecRow label="Vehicle classes" value={(driver.vehicle_class_experience ?? []).join(', ') || '—'} />
          <SpecRow label="Transmissions" value={(driver.transmission_experience ?? []).join(', ') || '—'} />
          <SpecRow label="Languages" value={(driver.languages ?? []).join(', ') || '—'} />
          <SpecRow
            label="Service radius"
            value={driver.service_radius_km ? `${driver.service_radius_km} km` : '—'}
          />
          <SpecRow label="Completed jobs" value={driver.completed_jobs ?? 0} variant="mono" />
        </dl>
      </div>

      {/* Book CTA */}
      <div className="border-t border-line pt-6">
        <Link href={`/customer/drivers/${driverId}/book`}>
          <Button size="lg" className="w-full sm:w-auto">
            Book {driver.full_name.split(' ')[0]}
          </Button>
        </Link>
      </div>
    </div>
  );
}
