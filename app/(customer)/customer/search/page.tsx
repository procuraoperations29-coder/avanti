'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, Users } from 'lucide-react';
import { AdminSectionLabel } from '@/components/avanti/admin/page-header';
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
    'rounded-full border px-3 py-1.5 font-body text-[11px] font-medium uppercase tracking-wide transition-all';

  return (
    <div className="mx-auto max-w-4xl px-4 pt-8 sm:px-6 pb-20">
      <Link
        href="/customer"
        className="mb-4 inline-flex items-center gap-1.5 font-body text-[13px] text-admin-text-muted transition-colors hover:text-admin-text"
      >
        <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2} /> Home
      </Link>

      <AdminSectionLabel>Search</AdminSectionLabel>
      <h1 className="mb-6 mt-2 font-display text-4xl font-semibold tracking-tight leading-tight text-admin-text">
        Find a driver.
      </h1>

      {/* Filters */}
      <div className="mb-6 space-y-3">
        <input
          type="search"
          placeholder="Search by name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-xl border border-admin-border bg-admin-card px-3 py-2.5 font-body text-sm text-admin-text shadow-admin-sm outline-none placeholder:text-admin-text-muted focus:border-admin-green focus:ring-2 focus:ring-admin-green/20"
        />

        <div>
          <div className="mb-2 font-body text-[11px] font-medium uppercase tracking-wide text-admin-text-muted">
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
                      ? 'border-admin-navy bg-admin-navy text-white shadow-admin-sm'
                      : 'border-admin-border bg-admin-card text-admin-text hover:bg-admin-bg'
                  )}
                >
                  {t === 'any' ? 'Any' : t.toUpperCase() + '+'}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="mb-2 font-body text-[11px] font-medium uppercase tracking-wide text-admin-text-muted">
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
                      ? 'border-admin-navy bg-admin-navy text-white shadow-admin-sm'
                      : 'border-admin-border bg-admin-card text-admin-text hover:bg-admin-bg'
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
