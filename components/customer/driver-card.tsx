import Link from 'next/link';
import { Star } from 'lucide-react';
import { Portrait } from '@/components/avanti/portrait';
import { TierBadge, type TierLevel } from '@/components/avanti/tier-badge';
import { cn } from '@/lib/utils/cn';

/**
 * DriverCard — used in search results and shortlists.
 *
 * Deliberately editorial: portrait, name in serif, tier stamp on the
 * right, credentials in mono. Not a hover-lifting Bento card.
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
  className,
}: DriverCardProps) {
  return (
    <Link
      href={`/customer/drivers/${driverId}`}
      className={cn(
        'group block border border-line bg-paper-2 p-5 transition-colors hover:bg-paper-3',
        className
      )}
    >
      <div className="flex items-start gap-4">
        <Portrait initials={initialsOf(fullName)} size="lg" tier={tier} />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate font-display text-2xl leading-tight text-ink">{fullName}</h3>
              {averageRating != null && (totalRatings ?? 0) > 0 && (
                <div className="mt-1 flex items-center gap-1 font-mono text-xs text-ink-muted">
                  <Star className="h-3 w-3 fill-brass text-brass" strokeWidth={0} />
                  {averageRating.toFixed(1)}
                  <span className="text-ink-faint">·</span>
                  <span>{totalRatings} rating{totalRatings === 1 ? '' : 's'}</span>
                </div>
              )}
            </div>
            <TierBadge tier={tier} />
          </div>

          {bio && (
            <p className="mt-3 line-clamp-2 font-body text-sm text-ink">{bio}</p>
          )}

          <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px] uppercase tracking-wider text-ink-muted">
            {(yearsExperience ?? 0) > 0 && (
              <div>
                <dt className="inline text-ink-faint">years </dt>
                <dd className="inline">{yearsExperience}</dd>
              </div>
            )}
            {(completedJobs ?? 0) > 0 && (
              <div>
                <dt className="inline text-ink-faint">jobs </dt>
                <dd className="inline">{completedJobs}</dd>
              </div>
            )}
            {(vehicleClassExperience ?? []).length > 0 && (
              <div>
                <dt className="inline text-ink-faint">classes </dt>
                <dd className="inline">{(vehicleClassExperience ?? []).join(', ')}</dd>
              </div>
            )}
            {(languages ?? []).length > 0 && (
              <div>
                <dt className="inline text-ink-faint">langs </dt>
                <dd className="inline">{(languages ?? []).join(', ')}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>
    </Link>
  );
}
