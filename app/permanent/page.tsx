import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';
import { getAuthUser } from '@/lib/auth';
import { SectionLabel } from '@/components/avanti/section-label';
import { TierBadge, type TierLevel } from '@/components/avanti/tier-badge';
import { SiteHeader } from '@/components/marketing/site-header';
import { SiteFooter } from '@/components/marketing/site-footer';
import {
  positionNameForTier,
  formatNaira,
} from '@/lib/permanent/salary';
import { getPricingSettings, tierSalary } from '@/lib/pricing/settings';

/**
 * Public marketing page for permanent driver placements.
 *
 * Editorial voice, three tiers with visible salary bands, clear CTA.
 * No enquiry form on this page — customers browse actual drivers first
 * at /customer/permanent (sign-in required).
 */

export default async function PermanentPage() {
  const user = await getAuthUser();
  const isSignedIn = Boolean(user);
  const ctaHref = isSignedIn ? '/customer/permanent' : '/sign-up?role=individual';
  const pricing = await getPricingSettings();

  const tiers: { tier: TierLevel; description: string }[] = [
    { tier: 't2', description: 'Verified across identity, licence, address, and background. Suited to family runs, school routines, and everyday driving.' },
    { tier: 't3', description: 'Three years documented experience minimum. Suited to executive routines, corporate schedules, and long-distance regulars.' },
    { tier: 't4', description: 'Executive protection trained. Defensive driving certified. For principals who require it.' },
  ];

  return (
    <div className="min-h-screen bg-paper text-ink">
      <SiteHeader
        isSignedIn={isSignedIn}
        continueHref="/customer/permanent"
        navLinks={[{ href: '/', label: 'Home' }]}
      />

      {/* Hero */}
      <section className="border-b border-line">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-24 md:grid-cols-5 md:py-32">
          <div className="md:col-span-3">
            <div className="mb-6 font-mono text-xs uppercase tracking-[0.2em] text-ink-muted">
              Permanent driver placements
            </div>
            <h1 className="font-display text-5xl leading-[1.05] text-ink md:text-7xl">
              A driver you <em className="italic">know</em>. Every day.
            </h1>
            <p className="mt-8 max-w-xl font-body text-lg leading-relaxed text-ink">
              For families, executives, and businesses who&apos;d rather have the
              same verified driver every morning. Handpicked by us, briefed by you,
              placed on retainer.
            </p>
            <div className="mt-10">
              <Link
                href={ctaHref}
                className="group inline-flex items-center gap-2 border border-ink bg-ink px-6 py-3 font-body text-sm text-paper transition-colors hover:bg-ink-2"
              >
                Browse permanent drivers
                <ArrowRight
                  className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                  strokeWidth={1.5}
                />
              </Link>
            </div>
          </div>

          <div className="md:col-span-2">
            <div className="border-l-2 border-brass bg-paper-2 p-8">
              <div className="mb-4 font-mono text-[10px] uppercase tracking-[0.2em] text-brass">
                What&apos;s included
              </div>
              <ul className="space-y-3 font-body text-sm text-ink">
                {[
                  'Personally vetted by our verification team',
                  'Monthly salary set by us, transparent up front',
                  "Replacement guarantee if the fit isn't right",
                  'You brief them, they work for you',
                  'One placement fee, then monthly salary only',
                ].map((line, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check
                      className="mt-0.5 h-4 w-4 shrink-0 text-brass"
                      strokeWidth={2}
                    />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Three tiers */}
      <section className="border-b border-line bg-paper-2">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <SectionLabel>Salary bands</SectionLabel>
          <h2 className="mt-4 max-w-3xl font-display text-4xl leading-tight text-ink md:text-5xl">
            Three levels, <em className="italic">one standard</em> of verification.
          </h2>
          <p className="mt-6 max-w-2xl font-body leading-relaxed text-ink">
            We set the salary. It reflects each driver&apos;s tier — the depth of
            verification and the experience they bring. You see the number
            up front and decide who fits.
          </p>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {tiers.map(({ tier, description }) => (
              <div key={tier} className="border border-line bg-paper p-8">
                <div className="mb-4">
                  <TierBadge tier={tier} label="short" />
                </div>
                <div className="font-display text-3xl leading-tight text-ink">
                  {positionNameForTier(tier)}
                </div>
                <div className="mt-4 font-display text-2xl leading-none text-brass">
                  {formatNaira(tierSalary(pricing, tier))}
                  <span className="ml-2 font-mono text-sm uppercase tracking-wider text-ink-muted">
                    /month
                  </span>
                </div>
                <p className="mt-6 font-body text-sm leading-relaxed text-ink">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <SectionLabel>How it works</SectionLabel>
          <h2 className="mt-4 max-w-3xl font-display text-4xl leading-tight text-ink md:text-5xl">
            Four steps to a driver on your team.
          </h2>

          <div className="mt-16 grid gap-16 md:grid-cols-4">
            {[
              {
                num: '01',
                title: 'Browse',
                body: "See every driver we've verified for permanent placement. Their portrait, experience, languages, and monthly salary.",
              },
              {
                num: '02',
                title: 'Choose',
                body: "Pick the driver you'd like to hire. Send us a short brief — start date, what you need them to do.",
              },
              {
                num: '03',
                title: 'Introduction',
                body: "We introduce you both. Meet, discuss the schedule, agree on terms. If they're not the right fit, pick another.",
              },
              {
                num: '04',
                title: 'Placement',
                body: 'Pay the one-time placement fee. Monthly salary starts. Your driver starts. You have our replacement guarantee.',
              },
            ].map((step) => (
              <div key={step.num} className="border-t border-line-strong pt-6">
                <div className="font-display text-5xl text-brass">{step.num}</div>
                <h3 className="mt-4 font-display text-xl leading-tight text-ink">
                  {step.title}
                </h3>
                <p className="mt-3 font-body text-sm leading-relaxed text-ink">
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-b border-line bg-ink">
        <div className="mx-auto max-w-4xl px-6 py-24 text-center">
          <div className="mb-6 font-mono text-[10px] uppercase tracking-[0.2em] text-paper/60">
            Ready?
          </div>
          <h2 className="font-display text-4xl leading-tight text-paper md:text-6xl">
            Find your driver.
          </h2>
          <div className="mt-10">
            <Link
              href={ctaHref}
              className="inline-flex items-center gap-2 border border-paper bg-paper px-6 py-3 font-body text-sm text-ink transition-colors hover:bg-paper-3"
            >
              Browse permanent drivers
              <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter
        productLinks={[
          { href: ctaHref, label: 'Browse permanent drivers' },
          { href: '/', label: 'Book by the hour or day' },
          { href: '/sign-up?role=driver', label: 'Drive with us' },
        ]}
      />
    </div>
  );
}
