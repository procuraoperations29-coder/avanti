import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { WizardHeader } from '@/components/driver/onboarding/wizard-header';
import { BackgroundStepForm } from './background-form';
import type { BackgroundData } from '@/lib/onboarding/state';

export default async function BackgroundStepPage() {
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
  const background = (state.background ?? {}) as BackgroundData;

  return (
    <div className="mx-auto max-w-3xl px-4 pt-8 sm:px-6 pb-20">
      <WizardHeader
        ordinal="04"
        label="Background"
        backHref="/driver/onboarding/step-address"
        backLabel="Address"
      />

      <h1 className="mb-6 font-display text-4xl leading-[1.05] text-ink md:text-5xl">
        Your <em className="italic">references</em>.
      </h1>

      <p className="mb-10 max-w-2xl font-body text-lg leading-relaxed text-ink">
        Two people who can vouch for you. Ideally people you&apos;ve worked for or
        with in the past — a former principal, a family member, a business
        partner. We may call them.
      </p>

      <div className="mb-10 border-l-2 border-brass bg-brass-soft px-6 py-5">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-brass">
          Please note
        </div>
        <p className="mt-2 max-w-2xl font-body text-sm leading-relaxed text-ink">
          Fake references will get you rejected. If we can&apos;t reach a reference
          within three attempts, it&apos;s treated as invalid.
        </p>
      </div>

      <BackgroundStepForm initialData={background} />
    </div>
  );
}
