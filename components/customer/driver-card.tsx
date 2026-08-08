import Link from 'next/link';
import { Star } from 'lucide-react';
import { Portrait } from '@/components/avanti/portrait';
import { TierBadge, type TierLevel } from '@/components/avanti/tier-badge';
import { cn } from '@/lib/utils/cn';

/**
 * DriverCard — used in search results and shortlists.
 *
 * Fintech surface: elevated card that lifts on hover, portrait with tier ring,
 * tier badge on the right, rating + credentials as compact tabular stats.
 */

export interface DriverCardProps {
  driverId: string;
  fullName: string;
  tier: TierLevel;
  averageRating: number | null;
  totalRatings: number | null;
  completedJobs: number | null;
  yearsExperience: number | null;
  languages: string[] | null;
  vehicleClassExperience: string[] | null;
  bio: string | null;
  photoUrl?: string | null;
  className?: string;
}

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-lg bg-admin-bg px-2 py-1 font-body text-[11px] text-admin-text-muted">
      <span className="font-semibold tabular-nums text-admin-text">{value}</span>
      {label}
    </span>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-lg bg-admin-bg px-2 py-1 font-body text-[11px] text-admin-text-muted">
      {children}
    </span>
  );
}

export function DriverCard({
  driverId,
  fullName,
  tier,
  averageRating,
  totalRatings,
  completedJobs,
  yearsExperience,
  languages,
  vehicleClassExperience,
  bio,
  photoUrl,
  className,
}: DriverCardProps) {
  return (
    <Link
      href={`/customer/drivers/${driverId}`}
      className={cn(
        'group block rounded-2xl border border-admin-border bg-admin-card p-5 shadow-admin-sm transition-all hover:-translate-y-0.5 hover:border-admin-green/40 hover:shadow-admin',
        className
      )}
    >
      <div className="flex items-start gap-4">
        <Portrait initials={initialsOf(fullName)} imageUrl={photoUrl} imageAlt={fullName} size="lg" tier={tier} />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate font-display text-xl font-semibold tracking-tight text-admin-text">
                {fullName}
              </h3>
              {averageRating != null && (totalRatings ?? 0) > 0 && (
                <div className="mt-1 flex items-center gap-1.5 font-body text-[12px] text-admin-text-muted">
                  <Star className="h-3.5 w-3.5 fill-admin-amber text-admin-amber" strokeWidth={0} />
                  <span className="font-medium tabular-nums text-admin-text">
                    {averageRating.toFixed(1)}
                  </span>
                  <span className="text-admin-text-muted">
                    · {totalRatings} rating{totalRatings === 1 ? '' : 's'}
                  </span>
                </div>
              )}
            </div>
            <TierBadge tier={tier} />
          </div>

          {bio && <p className="mt-3 line-clamp-2 font-body text-sm text-admin-text-muted">{bio}</p>}

          <div className="mt-3.5 flex flex-wrap gap-1.5">
            {(yearsExperience ?? 0) > 0 && <Stat label="yrs" value={yearsExperience!} />}
            {(completedJobs ?? 0) > 0 && <Stat label="jobs" value={completedJobs!} />}
            {(vehicleClassExperience ?? []).length > 0 && (
              <Chip>{(vehicleClassExperience ?? []).join(', ')}</Chip>
            )}
            {(languages ?? []).length > 0 && <Chip>{(languages ?? []).join(', ')}</Chip>}
          </div>
        </div>
      </div>
    </Link>
  );
}
