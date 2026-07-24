import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Users } from 'lucide-react';
import { getAuthUser } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { SectionLabel } from '@/components/avanti/section-label';
import { EmptyState } from '@/components/avanti/empty-state';
import { Portrait } from '@/components/avanti/portrait';
import { TierBadge, type TierLevel } from '@/components/avanti/tier-badge';
import {
  monthlySalaryForTier,
  positionNameForTier,
  formatNaira,
} from '@/lib/permanent/salary';

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

/**
 * Customer view: browse drivers available for permanent placement.
 *
 * Filters:
 *   - available_permanent = true
 *   - verification_status = 'approved'
 *   - not suspended, not deleted
 *
 * Only shows customer-safe fields. Salary is computed from tier via
 * the salary helper (not stored on driver_profiles).
 */

export default async function PermanentBrowsePage() {
  const user = await getAuthUser();
  if (!user) redirect('/sign-in?next=/customer/permanent');

  const admin = createServiceRoleClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profiles } = await (admin as any)
    .from('driver_profiles')
    .select(
      'id, user_id, verification_tier, years_experience, bio, languages, vehicle_class_experience'
    )
    .eq('available_permanent', true)
    .eq('verification_status', 'approved')
    .eq('suspended', false)
    .is('deleted_at', null)
    .order('verification_tier', { ascending: false });

  const list = profiles ?? [];

  // Batch fetch names
  const userIds = list.map((p: { user_id: string }) => p.user_id).filter(Boolean);
  let namesById: Record<string, string> = {};
  if (userIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: users } = await (admin as any)
      .from('users')
      .select('id, full_name')
      .in('id', userIds);
    namesById = Object.fromEntries(
      (users ?? []).map((u: { id: string; full_name: string | null }) => [
        u.id,
        u.full_name ?? 'Driver',
      ])
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 pt-8 pb-20">
        <Link
          href="/customer"
          className="mb-4 inline-flex items-center gap-1 font-mono text-xs uppercase tracking-wider text-ink-muted hover:text-ink"
        >
          <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
          Home
        </Link>

        <div className="mb-10">
          <SectionLabel>Permanent placements</SectionLabel>
          <h1 className="mt-2 font-display text-4xl leading-tight text-ink md:text-5xl">
            <em className="italic">Drivers</em> available for hire.
          </h1>
          <p className="mt-6 max-w-2xl font-body text-lg leading-relaxed text-ink">
            Handpicked, personally verified, available for permanent placement.
            Salary shown is set by Avanti and reflects the driver&apos;s tier.
          </p>
        </div>

        {list.length === 0 ? (
          <EmptyState
            Icon={Users}
            title="No drivers available yet"
            description="Come back soon. As we verify more drivers for permanent placements, they'll appear here."
          />
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {list.map((p: {
              id: string;
              user_id: string;
              verification_tier: string;
              years_experience: number | null;
              bio: string | null;
              languages: string[] | null;
              vehicle_class_experience: string[] | null;
            }) => {
              const tier = p.verification_tier as TierLevel;
              const name = namesById[p.user_id] ?? 'Driver';
              const salary = monthlySalaryForTier(tier);

              return (
                <Link
                  key={p.id}
                  href={`/customer/permanent/${p.id}`}
                  className="group flex gap-6 border border-line bg-paper-2 p-6 transition-colors hover:bg-paper-3"
                >
                  <div className="shrink-0">
                    <Portrait
                      initials={initialsOf(name)}
                      size="lg"
                      tier={tier}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex items-center gap-2">
                      <TierBadge tier={tier} label="short" />
                      <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                        {positionNameForTier(tier)}
                      </span>
                    </div>
                    <div className="font-display text-2xl leading-tight text-ink">
                      {name}
                    </div>

                    <div className="mt-3 font-display text-xl leading-none text-brass">
                      {formatNaira(salary)}
                      <span className="ml-2 font-mono text-xs uppercase tracking-wider text-ink-muted">
                        /month
                      </span>
                    </div>

                    <div className="mt-4 grid gap-2 font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                      {(p.years_experience ?? 0) > 0 && (
                        <div>
                          {p.years_experience} years professional experience
                        </div>
                      )}
                      {(p.languages ?? []).length > 0 && (
                        <div>Speaks {(p.languages ?? []).join(', ')}</div>
                      )}
                    </div>

                    <div className="mt-4 inline-flex items-center gap-1 font-mono text-xs uppercase tracking-wider text-ink transition-transform group-hover:translate-x-1">
                      Read more <ChevronRight className="h-3 w-3" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        <div className="mt-16 border-l-2 border-brass bg-brass-soft px-6 py-5">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-brass">
            Not what you&apos;re looking for?
          </div>
          <p className="mt-2 font-body text-sm leading-relaxed text-ink">
            If you need a driver only occasionally rather than permanently,{' '}
            <Link
              href="/customer/search"
              className="text-ink underline decoration-brass underline-offset-2 hover:decoration-2"
            >
              book by the hour or day
            </Link>{' '}
            instead.
          </p>
        </div>
    </div>
  );
}
