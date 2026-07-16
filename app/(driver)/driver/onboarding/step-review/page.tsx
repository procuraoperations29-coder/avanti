import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { WizardHeader } from '@/components/driver/onboarding/wizard-header';
import { ReviewClient } from './review-client';
import type {
  IdentityData,
  LicenceData,
  AddressData,
  BackgroundData,
  ExperienceData,
  PayoutData,
} from '@/lib/onboarding/state';

export default async function ReviewStepPage() {
  const user = await getAuthUser();
  if (!user) redirect('/sign-in');
  if (!user.roles.includes('driver')) redirect('/sign-in');

  const admin = createServiceRoleClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (admin as any)
    .from('driver_profiles')
    .select('onboarding_state, onboarding_submitted_at, available_on_demand, available_permanent')
    .eq('user_id', user.id)
    .single();

  if (profile?.onboarding_submitted_at) {
    redirect('/driver/onboarding/step-pending');
  }

  const state = (profile?.onboarding_state ?? {}) as Record<string, unknown>;
  const identity = (state.identity ?? {}) as IdentityData;
  const licence = (state.licence ?? {}) as LicenceData;
  const address = (state.address ?? {}) as AddressData;
  const background = (state.background ?? {}) as BackgroundData;
  const experience = (state.experience ?? {}) as ExperienceData;
  const payout = (state.payout ?? {}) as PayoutData;

  // Availability lives on two booleans, not a string
  const onDemand = Boolean(profile?.available_on_demand);
  const permanent = Boolean(profile?.available_permanent);
  const availabilitySummary =
    onDemand && permanent
      ? 'Both — on-demand and permanent'
      : onDemand
        ? 'On-demand (hourly / daily bookings)'
        : permanent
          ? 'Permanent placement (monthly salary)'
          : null;
  const availabilitySet = onDemand || permanent;

  return (
    <div className="mx-auto max-w-3xl px-4 pt-8 sm:px-6 pb-20">
      <WizardHeader
        ordinal="07"
        label="Review"
        backHref="/driver/onboarding/step-payout"
        backLabel="Payout"
      />

      <h1 className="mb-6 font-display text-4xl leading-[1.05] text-ink md:text-5xl">
        Almost <em className="italic">there</em>.
      </h1>

      <p className="mb-10 max-w-2xl font-body text-lg leading-relaxed text-ink">
        Take a moment to review what you&apos;ve entered. Edit anything that
        looks wrong. When you&apos;re happy, submit and we&apos;ll take it from
        here.
      </p>

      <ReviewClient
        identity={identity}
        licence={licence}
        address={address}
        background={background}
        experience={experience}
        availabilitySummary={availabilitySummary}
        availabilitySet={availabilitySet}
        payout={payout}
      />
    </div>
  );
}
