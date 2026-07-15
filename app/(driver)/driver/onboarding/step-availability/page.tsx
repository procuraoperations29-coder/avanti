import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { getAuthUser } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { PageShell } from '@/components/avanti/page-shell';
import { AvailabilityStepForm } from './availability-form';

/**
 * Onboarding step 06: Availability preference.
 *
 * Placed between Experience (05) and Payout (07). Driver picks whether
 * they're available for on-demand bookings, permanent placement, or both.
 * Persists to driver_profiles.available_on_demand + available_permanent.
 *
 * If the driver_profiles row doesn't exist yet, we bounce them back to
 * the wizard start.
 */

export default async function AvailabilityStepPage() {
  const user = await getAuthUser();
  if (!user) redirect('/sign-in');
  if (!user.roles.includes('driver')) redirect('/sign-in');

  const admin = createServiceRoleClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (admin as any)
    .from('driver_profiles')
    .select('available_on_demand, available_permanent')
    .eq('user_id', user.id)
    .single();

  if (!profile) redirect('/driver/onboarding/step-start');

  return (
    <PageShell>
      <div className="mx-auto max-w-3xl px-4 pt-8 sm:px-6 pb-20">
        <Link
          href="/driver/onboarding/step-experience"
          className="mb-4 inline-flex items-center gap-1 font-mono text-xs uppercase tracking-wider text-ink-muted hover:text-ink"
        >
          <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
          Experience
        </Link>

        {/* Ordinal number — brass, giant */}
        <div className="mb-2 font-display text-8xl leading-none text-brass md:text-9xl">
          06
        </div>
        <div className="mb-8 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
          Availability
        </div>

        <h1 className="mb-6 font-display text-4xl leading-[1.05] text-ink md:text-5xl">
          How do you want <em className="italic">to work</em>?
        </h1>

        <p className="mb-10 max-w-2xl font-body text-lg leading-relaxed text-ink">
          Two ways to drive with us. Pick one or pick both. You can change your
          mind any time from your dashboard.
        </p>

        <div className="mb-10 border-l-2 border-brass bg-brass-soft px-6 py-5">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-brass">
            About the pay
          </div>
          <p className="mt-2 max-w-2xl font-body text-sm leading-relaxed text-ink">
            For on-demand work, you&apos;re paid weekly for the hours you drive
            (5% withholding tax deducted). For permanent placement, we set your
            monthly salary based on your verified tier — between ₦175,000 and
            ₦325,000 depending on experience and background checks. Salary is
            fixed by us, not proposed by the customer.
          </p>
        </div>

        <AvailabilityStepForm
          initialOnDemand={profile.available_on_demand ?? true}
          initialPermanent={profile.available_permanent ?? false}
        />
      </div>
    </PageShell>
  );
}
