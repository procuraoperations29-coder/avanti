import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { WizardHeader } from '@/components/driver/onboarding/wizard-header';
import { IdentityStepForm } from './identity-form';
import type { IdentityData } from '@/lib/onboarding/state';

/**
 * Step 01 — Identity: legal name, DOB, government ID upload.
 */

export default async function IdentityStepPage() {
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
  const identity = (state.identity ?? {}) as IdentityData;

  return (
    <div className="mx-auto max-w-3xl px-4 pt-8 sm:px-6 pb-20">
      <WizardHeader
        ordinal="01"
        label="Identity"
        backHref="/driver/onboarding/step-start"
        backLabel="Welcome"
      />

      <h1 className="mb-6 font-display text-4xl leading-[1.05] text-ink md:text-5xl">
        Who <em className="italic">are you</em>?
      </h1>

      <p className="mb-10 max-w-2xl font-body text-lg leading-relaxed text-ink">
        We need your legal name as it appears on your ID, and a photo of your
        government-issued ID (front and back).
      </p>

      <div className="mb-10 border-l-2 border-brass bg-brass-soft px-6 py-5">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-brass">
          Why we ask
        </div>
        <p className="mt-2 max-w-2xl font-body text-sm leading-relaxed text-ink">
          Every driver on Avanti is verified against a real government ID. This
          is what our customers pay for — knowing the person behind the wheel is
          who they say they are.
        </p>
      </div>

      <IdentityStepForm initialData={identity} />
    </div>
  );
}
