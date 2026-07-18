import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Clock, FileWarning, XCircle, ShieldAlert, ArrowRight } from 'lucide-react';
import { getAuthUser } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { PageShell } from '@/components/avanti/page-shell';
import { SectionLabel } from '@/components/avanti/section-label';

function fmtDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default async function DriverOnboardingPendingPage() {
  const user = await getAuthUser();
  if (!user) redirect('/sign-in');
  if (!user.roles.includes('driver')) redirect('/sign-in');

  const admin = createServiceRoleClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (admin as any)
    .from('driver_profiles')
    .select(
      'id, verification_status, verification_tier, onboarding_submitted_at, suspended, suspended_reason, suspended_until'
    )
    .eq('user_id', user.id)
    .maybeSingle();

  // No driver_profiles row at all — never started onboarding.
  if (!profile) {
    redirect('/driver/onboarding');
  }

  // Already clear to go — don't strand an approved driver on this page.
  if (profile.verification_status === 'approved' && !profile.suspended) {
    redirect('/driver');
  }

  // Most recent verification event — carries the rationale / requested docs
  // for more_info_needed and rejected states.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: lastEvent } = await (admin as any)
    .from('verification_events')
    .select('rationale, requested_docs, created_at, to_status')
    .eq('driver_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  type Content = {
    Icon: typeof Clock;
    iconClass: string;
    eyebrow: string;
    title: React.ReactNode;
    body: React.ReactNode;
    action?: { href: string; label: string };
  };

  let content: Content;

  if (profile.suspended) {
    content = {
      Icon: ShieldAlert,
      iconClass: 'text-oxblood',
      eyebrow: 'Account suspended',
      title: <>Your account is <em className="italic">suspended.</em></>,
      body: (
        <>
          {profile.suspended_reason ?? 'Your driver account has been temporarily suspended.'}
          {profile.suspended_until && (
            <> This is expected to lift on {fmtDate(profile.suspended_until)}.</>
          )}{' '}
          If you believe this is a mistake, contact support.
        </>
      ),
    };
  } else if (profile.verification_status === 'not_started' || profile.verification_status === 'in_progress') {
    content = {
      Icon: Clock,
      iconClass: 'text-brass',
      eyebrow: 'Application incomplete',
      title: <>Let's finish your <em className="italic">application.</em></>,
      body: 'You started onboarding but haven\'t submitted it yet. Pick up where you left off — it only takes a few minutes to finish.',
      action: { href: '/driver/onboarding', label: 'Continue application' },
    };
  } else if (profile.verification_status === 'submitted' || profile.verification_status === 'under_review') {
    content = {
      Icon: Clock,
      iconClass: 'text-brass',
      eyebrow: 'Under review',
      title: <>Your application is <em className="italic">under review.</em></>,
      body: (
        <>
          Submitted {fmtDate(profile.onboarding_submitted_at)}. Our verification team is reviewing
          your documents and references — this usually takes 1–3 business days. We'll notify you
          the moment a decision is made.
        </>
      ),
    };
  } else if (profile.verification_status === 'more_info_needed') {
    content = {
      Icon: FileWarning,
      iconClass: 'text-brass',
      eyebrow: 'Action needed',
      title: <>We need a <em className="italic">little more.</em></>,
      body: (
        <>
          {lastEvent?.rationale ?? 'Our verification team needs additional information before they can continue.'}
          {lastEvent?.requested_docs && lastEvent.requested_docs.length > 0 && (
            <ul className="mt-4 list-inside list-disc space-y-1 text-left">
              {lastEvent.requested_docs.map((doc: string) => (
                <li key={doc} className="capitalize">{doc.replace(/_/g, ' ')}</li>
              ))}
            </ul>
          )}
        </>
      ),
      action: { href: '/driver/onboarding', label: 'Update application' },
    };
  } else if (profile.verification_status === 'rejected') {
    content = {
      Icon: XCircle,
      iconClass: 'text-oxblood',
      eyebrow: 'Application declined',
      title: <>We can't approve this <em className="italic">application.</em></>,
      body:
        lastEvent?.rationale ??
        "Your application didn't meet our verification requirements. If you think this was a mistake, contact support.",
    };
  } else {
    // Fallback for any status we don't have explicit copy for.
    content = {
      Icon: Clock,
      iconClass: 'text-brass',
      eyebrow: 'Application pending',
      title: <>Your application is <em className="italic">pending.</em></>,
      body: "We'll let you know as soon as there's an update.",
    };
  }

  const { Icon, iconClass, eyebrow, title, body, action } = content;

  return (
    <PageShell>
      <div className="mx-auto max-w-lg px-4 pt-24 text-center sm:px-6">
        <Icon className={`mx-auto mb-4 h-8 w-8 ${iconClass}`} strokeWidth={1.5} />
        <SectionLabel>{eyebrow}</SectionLabel>
        <h1 className="mb-6 mt-3 font-display text-4xl leading-tight text-ink sm:text-5xl">
          {title}
        </h1>
        <p className="mb-8 font-body leading-relaxed text-ink-muted">{body}</p>

        {action && (
          <Link
            href={action.href}
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap border-2 border-ink bg-ink px-6 py-3 font-body text-sm font-medium text-paper transition-colors hover:bg-ink-2"
          >
            {action.label}
            <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
          </Link>
        )}

        <div className="mt-10 font-mono text-[10px] uppercase tracking-wider text-ink-muted">
          Verification tier · {profile.verification_tier}
        </div>
      </div>
    </PageShell>
  );
}