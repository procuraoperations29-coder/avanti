import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { WizardHeader } from '@/components/driver/onboarding/wizard-header';
import { PayoutStepForm } from './payout-form';
import type { PayoutData } from '@/lib/onboarding/state';

export default async function PayoutStepPage() {
  const user = await getAuthUser();
  if (!user) redirect('/sign-in');
  if (!user.roles.includes('driver')) redirect('/sign-in');

  const admin = createServiceRoleClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (admin as any)
    .from('driver_profiles')
    .select('onboarding_state')
    .eq('user_id', user.id)
    .single();

  const state = (profile?.onboarding_state ?? {}) as Record<string, unknown>;
  const payout = (state.payout ?? {}) as PayoutData;

  return (
    <div className="mx-auto max-w-3xl px-4 pt-8 sm:px-6 pb-20">
      <WizardHeader
        ordinal="06"
        label="Payout"
        backHref="/driver/onboarding/step-availability"
        backLabel="Availability"
      />

      <h1 className="mb-6 font-display text-4xl leading-[1.05] text-ink md:text-5xl">
        Your <em className="italic">payout</em>.
      </h1>

      <p className="mb-10 max-w-2xl font-body text-lg leading-relaxed text-ink">
        Where should we send your earnings? On-demand earnings are paid every
        Friday. Permanent placement salaries are paid on the last working day
        of each month.
      </p>

      <div className="mb-10 border-l-2 border-brass bg-brass-soft px-6 py-5">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-brass">
          Match your name
        </div>
        <p className="mt-2 max-w-2xl font-body text-sm leading-relaxed text-ink">
          The account holder name must match the legal name on your ID. If
          they don&apos;t match, payouts will fail and we&apos;ll need to fix it before
          any money can move.
        </p>
      </div>

      <PayoutStepForm initialData={payout} />
    </div>
  );
}
