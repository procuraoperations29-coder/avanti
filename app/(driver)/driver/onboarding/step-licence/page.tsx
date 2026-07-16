import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { WizardHeader } from '@/components/driver/onboarding/wizard-header';
import { LicenceStepForm } from './licence-form';
import type { LicenceData } from '@/lib/onboarding/state';

/**
 * Step 02 — Driver's Licence: number, class, dates, both sides photo.
 */

export default async function LicenceStepPage() {
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
  const licence = (state.licence ?? {}) as LicenceData;

  return (
    <div className="mx-auto max-w-3xl px-4 pt-8 sm:px-6 pb-20">
      <WizardHeader
        ordinal="02"
        label="Licence"
        backHref="/driver/onboarding/step-identity"
        backLabel="Identity"
      />

      <h1 className="mb-6 font-display text-4xl leading-[1.05] text-ink md:text-5xl">
        Your <em className="italic">licence</em>.
      </h1>

      <p className="mb-10 max-w-2xl font-body text-lg leading-relaxed text-ink">
        A valid driver&apos;s licence is non-negotiable. We check both sides against
        the FRSC database.
      </p>

      <div className="mb-10 border-l-2 border-brass bg-brass-soft px-6 py-5">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-brass">
          Requirements
        </div>
        <p className="mt-2 max-w-2xl font-body text-sm leading-relaxed text-ink">
          Your licence must be in-date and cover the vehicle classes you intend
          to drive. Expired licences are automatic disqualification.
        </p>
      </div>

      <LicenceStepForm initialData={licence} />
    </div>
  );
}
