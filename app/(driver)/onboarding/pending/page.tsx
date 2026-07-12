import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getAuthUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { SectionLabel } from '@/components/avanti/section-label';
import { TierBadge } from '@/components/avanti/tier-badge';
import { Button } from '@/components/ui/button';
import { SignOutButton } from '@/app/(customer)/sign-out-button';

/**
 * Driver post-signup / post-submission landing.
 *
 * State-aware:
 *   - not_started + in_progress    → sends to /driver/onboarding (the wizard)
 *   - submitted / under_review     → shows the "review pending" screen
 *   - more_info_needed              → shows the "action required" screen
 *   - rejected                     → shows the rejected screen
 *   - approved                     → sends to /driver (once we build a driver dashboard)
 */

export default async function DriverPendingPage() {
  const user = await getAuthUser();
  if (!user) redirect('/sign-in');
  if (!user.roles.includes('driver')) redirect('/sign-in');

  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase as any)
    .from('driver_profiles')
    .select('verification_status, verification_tier, onboarding_submitted_at')
    .eq('user_id', user.id)
    .single();

  const status = (profile?.verification_status as string) ?? 'not_started';

  // Route not-yet-submitted drivers into the wizard
  if (status === 'not_started' || status === 'in_progress') {
    redirect('/driver/onboarding');
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pt-12 sm:px-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <SectionLabel>Signed in · {user.phone}</SectionLabel>
          <h1 className="mt-3 font-display text-4xl leading-tight text-ink">
            {status === 'submitted' || status === 'under_review' ? (
              <><em className="italic">Under review.</em></>
            ) : status === 'more_info_needed' ? (
              <>Action needed.</>
            ) : status === 'rejected' ? (
              <><em className="italic">Not approved.</em></>
            ) : (
              <>Ready to drive.</>
            )}
          </h1>
        </div>
        <SignOutButton />
      </div>

      {(status === 'submitted' || status === 'under_review') && (
        <div className="mb-6 border border-brass bg-brass-soft p-5">
          <SectionLabel>Waiting on us</SectionLabel>
          <p className="mt-3 font-body text-ink">
            Your documents are with the verification team. We usually get through submissions
            within one business day. You&apos;ll get a notification when the decision is made.
          </p>
          <div className="mt-4 font-mono text-xs text-ink-muted">
            Submitted{' '}
            {profile?.onboarding_submitted_at
              ? new Date(profile.onboarding_submitted_at).toLocaleString()
              : '—'}
          </div>
        </div>
      )}

      {status === 'more_info_needed' && (
        <div className="mb-6 border border-oxblood/40 bg-paper-2 p-5">
          <SectionLabel>More information needed</SectionLabel>
          <p className="mt-3 font-body text-ink">
            The verifier needs additional documents or clarification. Check your notifications
            for the specifics, then update your submission.
          </p>
          <div className="mt-4">
            <Link href="/driver/onboarding">
              <Button size="sm">Update submission</Button>
            </Link>
          </div>
        </div>
      )}

      {status === 'rejected' && (
        <div className="mb-6 border border-oxblood/40 bg-paper-2 p-5">
          <SectionLabel>Not approved</SectionLabel>
          <p className="mt-3 font-body text-ink">
            Your submission wasn&apos;t approved. Contact support if you believe this was in error.
          </p>
        </div>
      )}

      {status === 'approved' && (
        <div className="mb-6 border border-green bg-green-soft p-5">
          <SectionLabel>You&apos;re verified</SectionLabel>
          <div className="mt-3 flex items-center gap-3">
            <TierBadge tier={(profile?.verification_tier as 't1' | 't2' | 't3' | 't4') ?? 't1'} label="long" size="lg" />
            <p className="font-body text-ink">You&apos;re live and can start accepting engagements.</p>
          </div>
        </div>
      )}
    </div>
  );
}
