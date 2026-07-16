import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { WizardHeader } from '@/components/driver/onboarding/wizard-header';
import { ExperienceStepForm } from './experience-form';
import type { ExperienceData } from '@/lib/onboarding/state';

export default async function ExperienceStepPage() {
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
  const experience = (state.experience ?? {}) as ExperienceData;

  return (
    <div className="mx-auto max-w-3xl px-4 pt-8 sm:px-6 pb-20">
      <WizardHeader
        ordinal="05"
        label="Experience"
        backHref="/driver/onboarding/step-background"
        backLabel="Background"
      />

      <h1 className="mb-6 font-display text-4xl leading-[1.05] text-ink md:text-5xl">
        Your <em className="italic">driving</em>.
      </h1>

      <p className="mb-10 max-w-2xl font-body text-lg leading-relaxed text-ink">
        Tell us what you&apos;ve driven, for how long, and where you&apos;re
        comfortable working. This shapes which customers you get matched with.
      </p>

      <ExperienceStepForm initialData={experience} />
    </div>
  );
}
