import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Users } from 'lucide-react';
import { getAuthUser } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { getDriverSelfieUrls } from '@/lib/storage/upload';
import { AdminSectionLabel } from '@/components/avanti/admin/page-header';
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

  const selfieByUser = await getDriverSelfieUrls(userIds);

  return (
    <div className="mx-auto max-w-6xl px-6 pt-8 pb-20">
        <Link
          href="/customer"
          className="mb-4 inline-flex items-center gap-1.5 font-body text-[13px] text-admin-text-muted transition-colors hover:text-admin-text"
        >
          <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2} />
          Home
        </Link>

        <div className="mb-10">
          <AdminSectionLabel>Permanent placements</AdminSectionLabel>
          <h1 className="mt-2 font-display text-4xl font-semibold leading-tight tracking-tight text-admin-text md:text-5xl">
            Drivers available for hire.
          </h1>
          <p className="mt-6 max-w-2xl font-body text-lg leading-relaxed text-admin-text-muted">
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
                  className="group flex gap-6 rounded-2xl border border-admin-border bg-admin-card p-6 shadow-admin-sm transition-all hover:-translate-y-0.5 hover:border-admin-green/40 hover:shadow-admin"
                >
                  <div className="shrink-0">
                    <Portrait
                      initials={initialsOf(name)}
                      imageUrl={selfieByUser[p.user_id] ?? null}
                      imageAlt={name}
                      size="lg"
                      tier={tier}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex items-center gap-2">
                      <TierBadge tier={tier} label="short" />
                      <span className="inline-flex items-center rounded-full bg-admin-bg px-2 py-0.5 font-body text-[11px] font-medium uppercase tracking-wide text-admin-text-muted">
                        {positionNameForTier(tier)}
                      </span>
                    </div>
                    <div className="font-display text-2xl font-semibold leading-tight tracking-tight text-admin-text">
                      {name}
                    </div>

                    <div className="mt-3 font-display text-xl font-semibold leading-none tracking-tight tabular-nums text-admin-text">
                      {formatNaira(salary)}
                      <span className="ml-2 font-body text-xs font-medium text-admin-text-muted">
                        /month
                      </span>
                    </div>

                    <div className="mt-4 grid gap-1.5 font-body text-[12px] text-admin-text-muted">
                      {(p.years_experience ?? 0) > 0 && (
                        <div>
                          {p.years_experience} years professional experience
                        </div>
                      )}
                      {(p.languages ?? []).length > 0 && (
                        <div>Speaks {(p.languages ?? []).join(', ')}</div>
                      )}
                    </div>

                    <div className="mt-4 inline-flex items-center gap-1 font-body text-[13px] font-medium text-admin-green-text transition-transform group-hover:translate-x-1">
                      Read more <ChevronRight className="h-3.5 w-3.5" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        <div className="mt-16 rounded-2xl border border-admin-green/30 bg-admin-green-soft px-6 py-5 shadow-admin-sm">
          <div className="font-body text-[11px] font-medium uppercase tracking-wide text-admin-green-text">
            Not what you&apos;re looking for?
          </div>
          <p className="mt-2 font-body text-sm leading-relaxed text-admin-text">
            If you need a driver only occasionally rather than permanently,{' '}
            <Link
              href="/customer/search"
              className="font-medium text-admin-green-text underline underline-offset-2 hover:text-admin-green"
            >
              book by the hour or day
            </Link>{' '}
            instead.
          </p>
        </div>
    </div>
  );
}
