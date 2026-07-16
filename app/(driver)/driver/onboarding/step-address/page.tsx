import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { WizardHeader } from '@/components/driver/onboarding/wizard-header';
import { AddressStepForm } from './address-form';
import type { AddressData } from '@/lib/onboarding/state';

export default async function AddressStepPage() {
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
  const address = (state.address ?? {}) as AddressData;

  return (
    <div className="mx-auto max-w-3xl px-4 pt-8 sm:px-6 pb-20">
      <WizardHeader
        ordinal="03"
        label="Address"
        backHref="/driver/onboarding/step-licence"
        backLabel="Licence"
      />

      <h1 className="mb-6 font-display text-4xl leading-[1.05] text-ink md:text-5xl">
        Where do you <em className="italic">live</em>?
      </h1>

      <p className="mb-10 max-w-2xl font-body text-lg leading-relaxed text-ink">
        We need your current home address and a document that proves you live
        there. This is a soft check — bills in a family member&apos;s name are fine
        if you can explain the relationship.
      </p>

      <div className="mb-10 border-l-2 border-brass bg-brass-soft px-6 py-5">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-brass">
          Accepted proofs
        </div>
        <p className="mt-2 max-w-2xl font-body text-sm leading-relaxed text-ink">
          Utility bill (electricity, water, cable, internet), tenancy agreement,
          landlord letter, or a bank statement showing your address. Must be
          within the last 6 months.
        </p>
      </div>

      <AddressStepForm initialData={address} />
    </div>
  );
}
