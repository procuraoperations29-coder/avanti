import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * /driver/onboarding root — routes the driver to their appropriate next
 * step based on onboarding_state.last_step_completed.
 *
 * - Approved → /driver
 * - Submitted (not yet approved) → step-pending
 * - Otherwise → next incomplete step
 */

export default async function OnboardingRootPage() {
  const user = await getAuthUser();
  if (!user) redirect('/sign-in');

  const admin = createServiceRoleClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (admin as any)
    .from('driver_profiles')
    .select('onboarding_state, onboarding_submitted_at, verification_status')
    .eq('user_id', user.id)
    .single();

  if (profile?.verification_status === 'approved') {
    redirect('/driver');
  }

  if (profile?.onboarding_submitted_at) {
    redirect('/driver/onboarding/step-pending');
  }

  const state = (profile?.onboarding_state ?? {}) as Record<string, unknown>;
  const last = typeof state.last_step_completed === 'string' ? state.last_step_completed : null;

  if (!last || last === 'start') {
    redirect('/driver/onboarding/step-identity');
  }

  const nextByLast: Record<string, string> = {
    identity: '/driver/onboarding/step-licence',
    licence: '/driver/onboarding/step-address',
    address: '/driver/onboarding/step-background',
    background: '/driver/onboarding/step-experience',
    experience: '/driver/onboarding/step-availability',
    availability: '/driver/onboarding/step-payout',
    payout: '/driver/onboarding/step-review',
    review: '/driver/onboarding/step-pending',
  };

  redirect(nextByLast[last] ?? '/driver/onboarding/step-start');
}
