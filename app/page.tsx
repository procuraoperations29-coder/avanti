import Link from 'next/link';
import { getAuthUser } from '@/lib/auth';
import { ArrowRight, Check } from 'lucide-react';
import { SectionLabel } from '@/components/avanti/section-label';
import { StampBadge } from '@/components/avanti/stamp-badge';
import { TierBadge } from '@/components/avanti/tier-badge';

/**
 * Public landing page.
 *
 * Editorial voice — confident, unhurried. No pushy CTAs, no growth-hacky
 * social proof shim. What Avanti actually is: a curated, verified
 * marketplace for professional drivers, priced transparently.
 *
 * Signed-in users get a "continue" link back to their home instead of
 * the generic sign-in CTA.
 */

export default async function LandingPage() {
  const user = await getAuthUser();
  const isSignedIn = Boolean(user);

  return (
    <div className="min-h-screen bg-paper text-ink">
      {/* ─────────────────── SITE HEADER ─────────────────── */}
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-6xl items-baseline justify-between px-6 py-6">
          <Link href="/" className="font-display text-2xl tracking-tight text-ink">
            Avanti
          </Link>
          <nav className="flex items-center gap-8">
            <Link
              href="#how-it-works"
              className="hidden font-mono text-xs uppercase tracking-wider text-ink-muted hover:text-ink sm:inline"
            >
              How it works
            </Link>
            <Link
              href="#standards"
              className="hidden font-mono text-xs uppercase tracking-wider text-ink-muted hover:text-ink sm:inline"
            >
              Standards
            </Link>
            {isSignedIn ? (
              <Link
                href={
                  user!.roles.includes('super_admin')
                    ? '/admin'
                    : user!.roles.includes('driver')
                    ? '/driver'
                    : '/customer'
                }
                className="font-mono text-xs uppercase tracking-wider text-ink hover:text-ink-2"
              >
                Continue →
              </Link>
            ) : (
              <Link
                href="/sign-in"
                className="font-mono text-xs uppercase tracking-wider text-ink hover:text-ink-2"
              >
                Sign in
              </Link>
            )}
          </nav>
        </div>
      </header>

      {/* ─────────────────── HERO ─────────────────── */}
      <section className="border-b border-line">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-24 md:grid-cols-5 md:py-32">
          <div className="md:col-span-3">
            <div className="mb-6 font-mono text-xs uppercase tracking-[0.2em] text-ink-muted">
              Est. 2026 · Lagos
            </div>
            <h1 className="font-display text-5xl leading-[1.05] text-ink md:text-7xl">
              Every driver, <em className="italic">personally verified.</em>
            </h1>
            <p className="mt-8 max-w-xl font-body text-lg leading-relaxed text-ink">
              Nigeria&apos;s first properly curated marketplace for professional drivers.
              Book by the hour, day, or year — with drivers we&apos;ve vetted across identity,
              licence, background, and experience.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link
                href={isSignedIn ? '/customer/search' : '/sign-up?role=individual'}
                className="group inline-flex items-center gap-2 border border-ink bg-ink px-6 py-3 font-body text-sm text-paper transition-colors hover:bg-ink-2"
              >
                Find a driver
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={1.5} />
              </Link>
              <Link
                href={isSignedIn ? '/corporate' : '/sign-up?role=corporate'}
                className="inline-flex items-center gap-2 border border-line-strong bg-paper px-6 py-3 font-body text-sm text-ink transition-colors hover:bg-paper-3"
              >
                For business
              </Link>
            </div>
          </div>

          <div className="md:col-span-2">
            {/* Editorial pull-quote block — replaces stock hero photography */}
            <div className="relative border-l-2 border-brass bg-paper-2 p-8">
              <div className="mb-4 font-mono text-[10px] uppercase tracking-[0.2em] text-brass">
                From our founder
              </div>
              <blockquote className="font-display text-2xl italic leading-snug text-ink">
                &ldquo;A verified driver isn&apos;t a luxury. It&apos;s the baseline.
                We&apos;re just the first to insist on it.&rdquo;
              </blockquote>
              <div className="mt-6 font-mono text-xs uppercase tracking-wider text-ink-muted">
                — Temitayo Gbenro
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────── HOW IT WORKS ─────────────────── */}
      <section id="how-it-works" className="border-b border-line">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <SectionLabel>How it works</SectionLabel>
          <h2 className="mt-4 max-w-3xl font-display text-4xl leading-tight text-ink md:text-5xl">
            Three steps between you and a driver worth trusting.
          </h2>

          <div className="mt-16 grid gap-16 md:grid-cols-3">
            {[
              {
                num: '01',
                title: 'We verify',
                body:
                  "Every driver submits identity, licence, address, and background check consent. Our verification team reviews every submission personally — no self-service approvals.",
              },
              {
                num: '02',
                title: 'You book',
                body:
                  "Search by tier, vehicle class, or availability. Prices come from a published rate card, not a black-box algorithm. What you see is what you pay.",
              },
              {
                num: '03',
                title: 'They arrive',
                body:
                  "Your driver marks themselves en route, checks in on arrival, and completes the engagement. You know where things stand at every step. Rating and receipt follow.",
              },
            ].map((step) => (
              <div key={step.num} className="border-t border-line-strong pt-6">
                <div className="font-display text-6xl text-brass">{step.num}</div>
                <h3 className="mt-4 font-display text-2xl leading-tight text-ink">{step.title}</h3>
                <p className="mt-3 font-body leading-relaxed text-ink">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────── FOR WHOM ─────────────────── */}
      <section className="border-b border-line bg-paper-2">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <SectionLabel>Who we serve</SectionLabel>
          <h2 className="mt-4 max-w-3xl font-display text-4xl leading-tight text-ink md:text-5xl">
            Three kinds of relationships,{' '}
            <em className="italic">one standard of driver.</em>
          </h2>

          <div className="mt-16 grid gap-6 md:grid-cols-3">
            {[
              {
                label: 'For individuals',
                title: 'A driver, when you need one.',
                body: 'Airport runs, family errands, evening events, long-distance trips. Book by the hour or day, from ₦4,500 an hour.',
                href: isSignedIn ? '/customer/search' : '/sign-up?role=individual',
                cta: 'Book a driver',
              },
              {
                label: 'For business',
                title: 'Executive fleets, without the fleet.',
                body: 'Assign vetted drivers to your executives. Monthly retainers, corporate billing, single point of contact.',
                href: isSignedIn ? '/corporate' : '/sign-up?role=corporate',
                cta: 'For your team',
              },
              {
                label: 'For drivers',
                title: 'Fair rates, dignified work.',
                body: 'Fifteen to twenty percent commission. No opaque incentive schemes. Get paid weekly. Set your own service radius.',
                href: '/sign-up?role=driver',
                cta: 'Drive with us',
              },
            ].map((card) => (
              <Link
                key={card.label}
                href={card.href}
                className="group flex flex-col border border-line bg-paper p-8 transition-colors hover:bg-paper-3"
              >
                <div className="mb-4 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                  {card.label}
                </div>
                <h3 className="font-display text-2xl leading-tight text-ink">{card.title}</h3>
                <p className="mt-4 flex-1 font-body text-sm leading-relaxed text-ink">{card.body}</p>
                <div className="mt-8 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-ink transition-transform group-hover:translate-x-1">
                  {card.cta}
                  <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────── STANDARDS ─────────────────── */}
      <section id="standards" className="border-b border-line">
        <div className="mx-auto grid max-w-6xl gap-16 px-6 py-24 md:grid-cols-2 md:py-32">
          <div>
            <SectionLabel>Our standards</SectionLabel>
            <h2 className="mt-4 font-display text-4xl leading-tight text-ink md:text-5xl">
              Four tiers.{' '}
              <em className="italic">
                Each earned, not claimed.
              </em>
            </h2>
            <p className="mt-6 max-w-md font-body leading-relaxed text-ink">
              Every driver is placed into one of four tiers based on what we&apos;ve been
              able to verify. Higher tiers unlock executive assignments, longer engagements,
              and premium rates.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <StampBadge label="Identity verified" />
              <StampBadge label="Licence confirmed" />
              <StampBadge label="Background checked" />
              <StampBadge label="Executive certified" variant="filled" />
            </div>
          </div>

          <div className="space-y-6">
            {[
              {
                tier: 't1' as const,
                title: 'Standard',
                body: 'Identity + licence verified. Suitable for hourly city trips and short errands.',
              },
              {
                tier: 't2' as const,
                title: 'Verified',
                body: 'Adds address proof and background check. The default for most bookings.',
              },
              {
                tier: 't3' as const,
                title: 'Professional',
                body: 'Three years documented experience minimum. Executive tier eligible.',
              },
              {
                tier: 't4' as const,
                title: 'Executive',
                body: 'Defensive driving certified, executive protection trained. For principals who require it.',
              },
            ].map((row) => (
              <div key={row.tier} className="flex items-start gap-6 border-b border-line pb-6">
                <div className="pt-1">
                  <TierBadge tier={row.tier} />
                </div>
                <div className="flex-1">
                  <div className="font-display text-lg text-ink">{row.title}</div>
                  <p className="mt-1 font-body text-sm leading-relaxed text-ink-muted">{row.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────── CTA ─────────────────── */}
      <section className="border-b border-line bg-ink">
        <div className="mx-auto max-w-4xl px-6 py-24 text-center">
          <div className="mb-6 font-mono text-[10px] uppercase tracking-[0.2em] text-paper/60">
            Ready?
          </div>
          <h2 className="font-display text-4xl leading-tight text-paper md:text-6xl">
            Book a driver worth having on your side.
          </h2>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link
              href={isSignedIn ? '/customer/search' : '/sign-up?role=individual'}
              className="inline-flex items-center gap-2 border border-paper bg-paper px-6 py-3 font-body text-sm text-ink transition-colors hover:bg-paper-3"
            >
              Find a driver
              <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
            </Link>
            <Link
              href="#how-it-works"
              className="inline-flex items-center gap-2 border border-paper/40 bg-transparent px-6 py-3 font-body text-sm text-paper transition-colors hover:border-paper hover:bg-paper/5"
            >
              Learn how it works
            </Link>
          </div>
        </div>
      </section>

      {/* ─────────────────── FOOTER ─────────────────── */}
      <footer className="bg-paper">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="grid gap-12 md:grid-cols-4">
            <div>
              <div className="font-display text-2xl text-ink">Avanti</div>
              <p className="mt-3 font-body text-sm leading-relaxed text-ink-muted">
                Verified professional drivers, on your terms.
              </p>
            </div>

            <div>
              <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                Company
              </div>
              <ul className="space-y-2 font-body text-sm text-ink">
                <li>
                  <Link href="#" className="hover:text-ink-2">About</Link>
                </li>
                <li>
                  <Link href="#standards" className="hover:text-ink-2">Our standards</Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-ink-2">Careers</Link>
                </li>
              </ul>
            </div>

            <div>
              <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                Product
              </div>
              <ul className="space-y-2 font-body text-sm text-ink">
                <li>
                  <Link
                    href={isSignedIn ? '/customer/search' : '/sign-up?role=individual'}
                    className="hover:text-ink-2"
                  >
                    Find a driver
                  </Link>
                </li>
                <li>
                  <Link
                    href={isSignedIn ? '/corporate' : '/sign-up?role=corporate'}
                    className="hover:text-ink-2"
                  >
                    For business
                  </Link>
                </li>
                <li>
                  <Link href="/sign-up?role=driver" className="hover:text-ink-2">
                    Drive with us
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                Contact
              </div>
              <ul className="space-y-2 font-body text-sm text-ink">
                <li>hello@avanti.ng</li>
                <li>Lagos, Nigeria</li>
              </ul>
            </div>
          </div>

          <div className="mt-16 flex flex-col items-baseline justify-between gap-4 border-t border-line pt-6 sm:flex-row">
            <div className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
              © 2026 Avanti · All rights reserved
            </div>
            <div className="flex gap-6 font-mono text-[10px] uppercase tracking-wider text-ink-muted">
              <Link href="#" className="hover:text-ink">Terms</Link>
              <Link href="#" className="hover:text-ink">Privacy</Link>
              <Link href="#" className="hover:text-ink">Cookies</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
