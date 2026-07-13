'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, Users } from 'lucide-react';
import { SectionLabel } from '@/components/avanti/section-label';
import { EmptyState } from '@/components/avanti/empty-state';
import { ErrorState } from '@/components/avanti/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { DriverCard } from '@/components/customer/driver-card';
import type { TierLevel } from '@/components/avanti/tier-badge';
import { cn } from '@/lib/utils/cn';

interface DriverRow {
  driver_id: string;
  full_name: string;
  bio: string | null;
  years_experience: number | null;
  languages: string[] | null;
  vehicle_class_experience: string[] | null;
  verification_tier: TierLevel;
  average_rating: number | null;
  total_ratings: number | null;
  completed_jobs: number | null;
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [tier, setTier] = useState<'t2' | 't3' | 't4' | 'any'>('any');
  const [vehicleClass, setVehicleClass] = useState<string>('any');
  const [drivers, setDrivers] = useState<DriverRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (tier !== 'any') params.set('tier', tier);
        if (vehicleClass !== 'any') params.set('vehicle_class', vehicleClass);
        if (query.trim()) params.set('q', query.trim());

        const res = await fetch(`/api/customer/search?${params.toString()}`);
        const body = (await res.json()) as { drivers?: DriverRow[]; error?: string };
        if (cancelled) return;
        if (!res.ok) {
          setError(body.error ?? 'Search failed');
          return;
        }
        setDrivers(body.drivers ?? []);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Search failed');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [query, tier, vehicleClass]);

  const chip =
    'border px-3 py-1.5 font-mono text-xs uppercase tracking-wider transition-colors';

  return (
    <div className="mx-auto max-w-4xl px-4 pt-8 sm:px-6 pb-20">
      <Link
        href="/customer"
        className="mb-4 inline-flex items-center gap-1 font-mono text-xs uppercase tracking-wider text-ink-muted hover:text-ink"
      >
        <ChevronLeft className="h-3.5 w-3.5" /> Home
      </Link>

      <SectionLabel>Search</SectionLabel>
      <h1 className="mb-6 mt-2 font-display text-4xl leading-tight text-ink">
        Find a <em className="italic">driver</em>.
      </h1>

      {/* Filters */}
      <div className="mb-6 space-y-3">
        <input
          type="search"
          placeholder="Search by name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full border border-line-strong bg-paper-2 px-4 py-3 font-body text-sm text-ink outline-none placeholder:text-ink-faint focus:border-ink"
        />

        <div>
          <div className="mb-2 font-mono text-[10px] uppercase tracking-wider text-ink-muted">
            Tier
          </div>
          <div className="flex flex-wrap gap-2">
            {(['any', 't2', 't3', 't4'] as const).map((t) => {
              const selected = tier === t;
              return (
                <button
                  key={t}
                  onClick={() => setTier(t)}
                  className={cn(
                    chip,
                    selected
                      ? 'border-ink bg-ink text-paper'
                      : 'border-line-strong bg-paper-2 text-ink hover:bg-paper-3'
                  )}
                >
                  {t === 'any' ? 'Any' : t.toUpperCase() + '+'}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="mb-2 font-mono text-[10px] uppercase tracking-wider text-ink-muted">
            Vehicle class
          </div>
          <div className="flex flex-wrap gap-2">
            {(['any', 'sedan', 'suv', 'executive', 'van', 'pickup'] as const).map((v) => {
              const selected = vehicleClass === v;
              return (
                <button
                  key={v}
                  onClick={() => setVehicleClass(v)}
                  className={cn(
                    chip,
                    selected
                      ? 'border-ink bg-ink text-paper'
                      : 'border-line-strong bg-paper-2 text-ink hover:bg-paper-3'
                  )}
                >
                  {v}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : error ? (
        <ErrorState title="Search failed" description={error} onRetry={() => setQuery(query)} />
      ) : drivers.length === 0 ? (
        <EmptyState
          Icon={Users}
          title="No drivers match"
          description="Try relaxing your filters."
        />
      ) : (
        <div className="space-y-3">
          {drivers.map((d) => (
            <DriverCard
              key={d.driver_id}
              driverId={d.driver_id}
              fullName={d.full_name}
              tier={d.verification_tier}
              averageRating={d.average_rating}
              totalRatings={d.total_ratings}
              completedJobs={d.completed_jobs}
              yearsExperience={d.years_experience}
              languages={d.languages}
              vehicleClassExperience={d.vehicle_class_experience}
              bio={d.bio}
            />
          ))}
        </div>
      )}
    </div>
  );
}
