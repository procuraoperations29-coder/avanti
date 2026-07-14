import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { getAuthUser } from '@/lib/auth';
import { SectionLabel } from '@/components/avanti/section-label';

/**
 * Sign-up router / role picker.
 *
 * Two behaviours:
 *   1. If `?role=individual|corporate|driver` is present, redirect to
 *      the role-specific signup route (from Slice 3).
 *   2. Otherwise, present an editorial role-picker matching the
 *      landing page's "Who we serve" section.
 *
 * If the user's already signed in, sends them to their role home.
 */

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const { role } = await searchParams;

  const user = await getAuthUser();
  if (user) {
    if (user.roles.includes('driver')) redirect('/driver');
    if (
      user.roles.includes('admin_verifier') ||
      user.roles.includes('super_admin') ||
      user.roles.includes('admin_finance') ||
      user.roles.includes('admin_support') ||
      user.roles.includes('admin_compliance')
    ) {
      redirect('/admin');
    }
    redirect('/customer');
  }

  // Role-specific redirect
  if (role === 'individual') redirect('/sign-up/customer');
  if (role === 'corporate') redirect('/sign-up/corporate');
  if (role === 'driver') redirect('/sign-up/driver');

  // Otherwise: editorial picker
  const options = [
    {
      role: 'individual',
      label: 'For individuals',
      title: 'Book drivers as yourself.',
      body: 'For airport runs, family errands, evening events, long-distance trips. Book by the hour or the day, from ₦4,500 an hour.',
      href: '/sign-up/customer',
    },
    {
      role: 'corporate',
      label: 'For business',
      title: 'Book drivers for your team.',
      body: 'Assign vetted drivers to your executives or fleet. Monthly retainers, corporate billing, a single point of contact.',
      href: '/sign-up/corporate',
    },
    {
      role: 'driver',
      label: 'For drivers',
      title: 'Drive with us.',
      body: 'Fifteen to twenty percent commission. No opaque incentive schemes. Weekly payouts. Set your own service radius.',
      href: '/sign-up/driver',
    },
  ];

  return (
    <div className="min-h-screen bg-paper">
      {/* Header */}
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-6xl items-baseline justify-between px-6 py-6">
          <Link href="/" className="font-display text-2xl tracking-tight text-ink">
            Avanti
          </Link>
          <Link
            href="/sign-in"
            className="font-mono text-xs uppercase tracking-wider text-ink-muted hover:text-ink"
          >
            Already have an account? Sign in →
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
          <SectionLabel>Create an account</SectionLabel>
          <h1 className="mt-4 max-w-3xl font-display text-5xl leading-[1.05] text-ink md:text-7xl">
            Which side of Avanti are <em className="italic">you</em>?
          </h1>
          <p className="mt-8 max-w-2xl font-body text-lg leading-relaxed text-ink">
            Three kinds of accounts, one standard of driver. Pick the one that fits
            what you&apos;re here for.
          </p>
        </div>
      </section>

      {/* Options */}
      <section className="border-b border-line bg-paper-2">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="grid gap-6 md:grid-cols-3">
            {options.map((opt) => (
              <Link
                key={opt.role}
                href={opt.href}
                className="group flex flex-col border border-line bg-paper p-8 transition-colors hover:bg-paper-3"
              >
                <div className="mb-4 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                  {opt.label}
                </div>
                <h3 className="font-display text-2xl leading-tight text-ink">{opt.title}</h3>
                <p className="mt-4 flex-1 font-body text-sm leading-relaxed text-ink">{opt.body}</p>
                <div className="mt-8 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-ink transition-transform group-hover:translate-x-1">
                  Continue
                  <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Footer strip */}
      <div className="mx-auto max-w-6xl px-6 py-8 text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
          Est. 2026 · Lagos
        </p>
      </div>
    </div>
  );
}
