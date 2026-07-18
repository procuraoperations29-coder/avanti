import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Clock, Mail } from 'lucide-react';
import { getAuthUser } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { SectionLabel } from '@/components/avanti/section-label';

/**
 * Post-submission page. Shown after the driver submits onboarding.
 * Their verification_status is 'submitted' but not yet 'approved'.
 */

export default async function OnboardingPendingPage() {
  const user = await getAuthUser();
  if (!user) redirect('/sign-in');

  const admin = createServiceRoleClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (admin as any)
    .from('driver_profiles')
    .select('verification_status, onboarding_submitted_at')
    .eq('user_id', user.id)
    .single();

  if (profile?.verification_status === 'approved') {
    redirect('/driver');
  }

  // If they haven't actually submitted yet, send them back to the wizard root
  if (!profile?.onboarding_submitted_at) {
    redirect('/driver/onboarding');
  }

  const submittedAt = new Date(profile.onboarding_submitted_at);

  return (
    <div className="mx-auto max-w-3xl px-4 pt-16 sm:px-6 pb-20">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center border-2 border-brass bg-brass-soft">
          <Clock className="h-5 w-5 text-brass" strokeWidth={1.5} />
        </div>
        <SectionLabel>Under review</SectionLabel>
      </div>

      <h1 className="mb-6 font-display text-5xl leading-[1.05] text-ink md:text-6xl">
        Thanks. We&apos;ve <em className="italic">got it</em>.
      </h1>

      <p className="mb-10 max-w-2xl font-body text-lg leading-relaxed text-ink">
        Your onboarding is complete and with our verification team. We review each
        driver personally — usually within one business day.
      </p>

      <div className="mb-10 grid gap-6 md:grid-cols-2">
        <div className="border border-line bg-paper-2 p-6">
          <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
            Submitted
          </div>
          <div className="font-display text-2xl leading-tight text-ink">
            {submittedAt.toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </div>
          <div className="mt-1 font-mono text-xs text-ink-muted">
            {submittedAt.toLocaleTimeString('en-GB', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        </div>
        <div className="border border-line bg-paper-2 p-6">
          <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
            Expected decision
          </div>
          <div className="font-display text-2xl leading-tight text-ink">
            Within 24 hours
          </div>
          <div className="mt-1 font-mono text-xs text-ink-muted">
            One business day
          </div>
        </div>
      </div>

      <div className="border-l-2 border-brass bg-brass-soft px-6 py-5">
        <div className="mb-2 flex items-center gap-2">
          <Mail className="h-4 w-4 text-brass" strokeWidth={1.5} />
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-brass">
            What happens next
          </div>
        </div>
        <p className="max-w-2xl font-body text-sm leading-relaxed text-ink">
          You&apos;ll get an email once we&apos;ve made a decision. If anything needs
          clarification, we&apos;ll reach out first. Approved drivers get access to
          the roster immediately — you can start taking bookings the same day.
        </p>
      </div>

      <div className="mt-10 flex items-center justify-between border-t border-line pt-8">
        <Link
          href="/"
          className="font-mono text-xs uppercase tracking-wider text-ink-muted hover:text-ink"
        >
          ← Back to home
        </Link>
        <Link
          href="mailto:hello@avanti.com.ng"
          className="font-mono text-xs uppercase tracking-wider text-ink hover:text-ink-2"
        >
          Contact support →
        </Link>
      </div>
    </div>
  );
}
