import Link from 'next/link';
import {
  ArrowRight,
  ShieldCheck,
  BadgeCheck,
  Star,
  MapPin,
  CreditCard,
  Clock,
  Lock,
  Sparkles,
  Car,
  Building2,
  Users,
  TrendingUp,
} from 'lucide-react';
import { getAuthUser } from '@/lib/auth';
import { FintechHeader } from '@/components/marketing/fintech-header';
import { FintechFooter } from '@/components/marketing/fintech-footer';

/**
 * Public landing page — fintech skin (admin-* tokens, light + dark aware).
 * Gradient-mesh hero with a live app mockup, glass stat cards, and a few
 * tinted photographs for warmth. Signed-in visitors get a "continue" path.
 *
 * Photos are Unsplash CDN URLs, centralised here so they're trivial to swap.
 */
const PHOTOS = {
  // Black father and daughter — warm, family-oriented (free Unsplash, verified)
  individuals: 'https://images.unsplash.com/photo-1624272864537-8ecc72b67958?auto=format&fit=crop&w=1100&q=70',
  // Confident Black executive in a suit (free Unsplash, verified)
  business: 'https://images.unsplash.com/photo-1616805765352-beedbad46b2a?auto=format&fit=crop&w=1100&q=70',
  // Black professional driving a car (free Unsplash, verified)
  drivers: 'https://images.unsplash.com/photo-1616805111699-0e52fa62f779?auto=format&fit=crop&w=1100&q=70',
  standards: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1400&q=70',
};

export default async function LandingPage() {
  const user = await getAuthUser();
  const isSignedIn = Boolean(user);
  const continueHref = user?.roles.includes('super_admin')
    ? '/admin'
    : user?.roles.includes('driver')
      ? '/driver'
      : user?.roles.includes('corporate_admin') || user?.roles.includes('corporate_member')
        ? '/corporate'
        : '/customer';
  const findDriverHref = isSignedIn ? '/customer/search' : '/sign-up?role=individual';
  const businessHref = isSignedIn ? '/corporate' : '/sign-up?role=corporate';

  return (
    <div className="min-h-dvh bg-admin-bg text-admin-text">
      <FintechHeader
        isSignedIn={isSignedIn}
        continueHref={continueHref}
        primaryHref={findDriverHref}
        navLinks={[
          { href: '#how', label: 'How it works' },
          { href: '#standards', label: 'Standards' },
          { href: '#audience', label: 'Who it’s for' },
          { href: '/permanent', label: 'Permanent placements' },
        ]}
      />

      {/* ───────────────── HERO ───────────────── */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -left-32 -top-40 h-[30rem] w-[30rem] rounded-full bg-admin-green/25 blur-[130px]" />
          <div className="absolute -right-24 top-0 h-[34rem] w-[34rem] rounded-full bg-admin-navy/30 blur-[140px]" />
          <div className="absolute bottom-0 left-1/3 h-[22rem] w-[22rem] rounded-full bg-admin-green/10 blur-[120px]" />
        </div>

        <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 py-20 sm:px-6 md:grid-cols-2 md:py-28">
          {/* Copy */}
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-admin-border bg-admin-card px-3 py-1.5 shadow-admin-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-admin-green opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-admin-green" />
              </span>
              <span className="font-body text-[12px] font-medium text-admin-text-muted">Verified drivers · live in Lagos</span>
            </div>

            <h1 className="mt-6 font-display text-5xl font-semibold leading-[1.05] tracking-tight text-admin-text md:text-6xl">
              Professional drivers,{' '}
              <span className="bg-gradient-to-r from-admin-green to-admin-green-text bg-clip-text text-transparent">personally verified.</span>
            </h1>

            <p className="mt-6 max-w-lg font-body text-lg leading-relaxed text-admin-text-muted">
              Book a vetted driver by the hour, day, or year — with transparent pricing and secure payments.
              Every driver is checked across identity, licence, background, and experience.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={findDriverHref}
                className="group inline-flex items-center gap-2 rounded-full bg-admin-green px-6 py-3.5 font-body text-sm font-semibold text-white shadow-admin-glow transition-transform hover:-translate-y-0.5"
              >
                Find a driver
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2} />
              </Link>
              <Link
                href={businessHref}
                className="inline-flex items-center gap-2 rounded-full border border-admin-border bg-admin-card px-6 py-3.5 font-body text-sm font-semibold text-admin-text shadow-admin-sm transition-colors hover:bg-admin-bg"
              >
                For business
              </Link>
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
              {[
                { k: '4 tiers', v: 'Earned, not claimed' },
                { k: '100%', v: 'Manually verified' },
                { k: 'Hourly', v: 'Or daily & yearly' },
              ].map((s) => (
                <div key={s.k}>
                  <div className="font-display text-2xl font-semibold tracking-tight text-admin-text">{s.k}</div>
                  <div className="font-body text-[12px] text-admin-text-muted">{s.v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* App mockup */}
          <div className="relative">
            <div className="relative mx-auto max-w-sm rounded-[28px] border border-admin-border bg-admin-card p-5 shadow-admin-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 rounded-full bg-admin-green" />
                  <span className="font-body text-[12px] font-medium text-admin-text-muted">Trip in progress</span>
                </div>
                <span className="font-display text-sm font-bold text-admin-text">Avanti</span>
              </div>

              {/* Driver match */}
              <div className="mt-4 rounded-2xl border border-admin-border bg-admin-bg p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-admin-navy font-display text-base font-semibold text-white">CO</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-body text-sm font-semibold text-admin-text">Chidi O.</span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-admin-green-soft px-2 py-0.5 font-body text-[10px] font-semibold uppercase tracking-wide text-admin-green-text">
                        <BadgeCheck className="h-3 w-3" strokeWidth={2.5} /> T4 Executive
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-1 font-body text-[12px] text-admin-text-muted">
                      <Star className="h-3 w-3 fill-admin-amber text-admin-amber" strokeWidth={0} /> 4.98 · 320 trips
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2 font-body text-[12px] text-admin-text-muted">
                  <MapPin className="h-3.5 w-3.5 text-admin-green" strokeWidth={2} /> 3 min away · Toyota Camry · Black
                </div>
              </div>

              {/* Price row */}
              <div className="mt-3 flex items-center justify-between rounded-2xl border border-admin-border bg-admin-bg px-4 py-3">
                <div>
                  <div className="font-body text-[11px] uppercase tracking-wide text-admin-text-muted">Rate</div>
                  <div className="font-display text-lg font-semibold text-admin-text">₦4,500<span className="text-sm font-normal text-admin-text-muted">/hr</span></div>
                </div>
                <div className="text-right">
                  <div className="font-body text-[11px] uppercase tracking-wide text-admin-text-muted">Fees</div>
                  <div className="font-display text-lg font-semibold text-admin-green-text">₦0</div>
                </div>
              </div>

              <button className="mt-3 w-full rounded-2xl bg-admin-green py-3 font-body text-sm font-semibold text-white shadow-admin-sm">
                Confirm booking
              </button>
            </div>

            {/* Floating chips */}
            <div className="absolute -left-3 top-8 hidden rounded-2xl border border-admin-border bg-admin-card px-3 py-2 shadow-admin sm:block">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-admin-green" strokeWidth={2} />
                <span className="font-body text-[12px] font-medium text-admin-text">Background checked</span>
              </div>
            </div>
            <div className="absolute -right-3 bottom-10 hidden rounded-2xl border border-admin-border bg-admin-card px-3 py-2 shadow-admin sm:block">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-admin-green" strokeWidth={2} />
                <span className="font-body text-[12px] font-medium text-admin-text">Secure payments</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────── TRUST STRIP ───────────────── */}
      <section className="border-y border-admin-border bg-admin-card">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px overflow-hidden px-5 sm:px-6 md:grid-cols-4">
          {[
            { icon: ShieldCheck, k: 'Every driver vetted', v: 'Identity, licence, background' },
            { icon: CreditCard, k: 'Published rate card', v: 'No black-box pricing' },
            { icon: Clock, k: 'Hour, day, or year', v: 'Book how you need' },
            { icon: Sparkles, k: 'Executive tier', v: 'Trained & certified' },
          ].map((f) => (
            <div key={f.k} className="flex items-start gap-3 py-7 md:px-6">
              <f.icon className="mt-0.5 h-5 w-5 shrink-0 text-admin-green" strokeWidth={2} />
              <div>
                <div className="font-body text-sm font-semibold text-admin-text">{f.k}</div>
                <div className="font-body text-[12px] text-admin-text-muted">{f.v}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ───────────────── HOW IT WORKS ───────────────── */}
      <section id="how" className="mx-auto max-w-6xl px-5 py-24 sm:px-6">
        <div className="max-w-2xl">
          <div className="font-body text-[12px] font-semibold uppercase tracking-wide text-admin-green-text">How it works</div>
          <h2 className="mt-3 font-display text-4xl font-semibold leading-tight tracking-tight text-admin-text md:text-5xl">
            Three steps between you and a driver worth trusting.
          </h2>
        </div>

        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {[
            { n: '01', icon: ShieldCheck, t: 'We verify', b: 'Every driver submits identity, licence, address, and background consent. Our team reviews each one personally — no self-service approvals.' },
            { n: '02', icon: CreditCard, t: 'You book', b: 'Search by tier, vehicle class, or availability. Prices come from a published rate card, not an algorithm. What you see is what you pay.' },
            { n: '03', icon: MapPin, t: 'They arrive', b: 'Your driver marks en route, checks in on arrival, and completes the trip. You know exactly where things stand — receipt and rating follow.' },
          ].map((s) => (
            <div key={s.n} className="group rounded-3xl border border-admin-border bg-admin-card p-7 shadow-admin-sm transition-shadow hover:shadow-admin">
              <div className="flex items-center justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-admin-green-soft text-admin-green-text">
                  <s.icon className="h-5 w-5" strokeWidth={2} />
                </span>
                <span className="font-display text-4xl font-semibold text-admin-border">{s.n}</span>
              </div>
              <h3 className="mt-5 font-display text-xl font-semibold text-admin-text">{s.t}</h3>
              <p className="mt-2 font-body text-sm leading-relaxed text-admin-text-muted">{s.b}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ───────────────── WHO IT'S FOR ───────────────── */}
      <section id="audience" className="border-t border-admin-border bg-admin-card">
        <div className="mx-auto max-w-6xl px-5 py-24 sm:px-6">
          <div className="max-w-2xl">
            <div className="font-body text-[12px] font-semibold uppercase tracking-wide text-admin-green-text">Who it&apos;s for</div>
            <h2 className="mt-3 font-display text-4xl font-semibold leading-tight tracking-tight text-admin-text md:text-5xl">
              Three relationships, one standard of driver.
            </h2>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {[
              { photo: PHOTOS.individuals, icon: Car, label: 'For individuals', title: 'A driver, when you need one.', body: 'Airport runs, family errands, events, long-distance trips. Book by the hour or day, from ₦4,500/hr.', href: findDriverHref, cta: 'Book a driver' },
              { photo: PHOTOS.business, icon: Building2, label: 'For business', title: 'Executive fleets, without the fleet.', body: 'Assign vetted drivers to your executives. Monthly retainers, corporate billing, one point of contact.', href: businessHref, cta: 'For your team' },
              { photo: PHOTOS.drivers, icon: Users, label: 'For drivers', title: 'Fair rates, dignified work.', body: 'Fifteen to twenty percent commission. No opaque incentives. Get paid on time. Set your own radius.', href: '/sign-up?role=driver', cta: 'Drive with us' },
            ].map((c) => (
              <Link
                key={c.label}
                href={c.href}
                className="group flex flex-col overflow-hidden rounded-3xl border border-admin-border bg-admin-bg shadow-admin-sm transition-shadow hover:shadow-admin"
              >
                <div className="relative h-40 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c.photo} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-admin-navy/85 via-admin-navy/25 to-transparent" />
                  <div className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 font-body text-[11px] font-semibold uppercase tracking-wide text-white backdrop-blur">
                    <c.icon className="h-3.5 w-3.5" strokeWidth={2} /> {c.label}
                  </div>
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <h3 className="font-display text-xl font-semibold leading-tight text-admin-text">{c.title}</h3>
                  <p className="mt-3 flex-1 font-body text-sm leading-relaxed text-admin-text-muted">{c.body}</p>
                  <div className="mt-6 inline-flex items-center gap-1.5 font-body text-sm font-semibold text-admin-green-text transition-transform group-hover:translate-x-1">
                    {c.cta} <ArrowRight className="h-4 w-4" strokeWidth={2} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────── STANDARDS / TIERS ───────────────── */}
      <section id="standards" className="mx-auto max-w-6xl px-5 py-24 sm:px-6">
        <div className="grid gap-12 md:grid-cols-2 md:items-center">
          <div className="relative overflow-hidden rounded-3xl border border-admin-border shadow-admin">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={PHOTOS.standards} alt="" className="h-full min-h-[22rem] w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-tr from-admin-navy/90 via-admin-navy/50 to-admin-green/20" />
            <div className="absolute inset-0 flex flex-col justify-end p-8">
              <div className="font-body text-[12px] font-semibold uppercase tracking-wide text-white/70">Our standards</div>
              <h2 className="mt-2 font-display text-3xl font-semibold leading-tight text-white md:text-4xl">
                Four tiers. Each earned, not claimed.
              </h2>
              <div className="mt-5 flex flex-wrap gap-2">
                {['Identity', 'Licence', 'Background', 'Executive'].map((t) => (
                  <span key={t} className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 font-body text-[11px] font-medium text-white backdrop-blur">
                    <BadgeCheck className="h-3.5 w-3.5" strokeWidth={2} /> {t}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {[
              { tier: 'T1', title: 'Standard', body: 'Identity + licence verified. Hourly city trips and short errands.' },
              { tier: 'T2', title: 'Verified', body: 'Adds address proof and background check. The default for most bookings.' },
              { tier: 'T3', title: 'Professional', body: 'Three years documented experience minimum. Executive-tier eligible.' },
              { tier: 'T4', title: 'Executive', body: 'Defensive-driving certified, executive-protection trained. For principals who require it.' },
            ].map((row) => (
              <div key={row.tier} className="flex items-start gap-4 rounded-2xl border border-admin-border bg-admin-card p-5 shadow-admin-sm">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-admin-navy font-display text-sm font-bold text-white">{row.tier}</span>
                <div>
                  <div className="font-display text-base font-semibold text-admin-text">{row.title}</div>
                  <p className="mt-1 font-body text-sm leading-relaxed text-admin-text-muted">{row.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────── WHY AVANTI (fintech assurances) ───────────────── */}
      <section className="border-t border-admin-border bg-admin-card">
        <div className="mx-auto max-w-6xl px-5 py-24 sm:px-6">
          <div className="max-w-2xl">
            <div className="font-body text-[12px] font-semibold uppercase tracking-wide text-admin-green-text">Built on trust</div>
            <h2 className="mt-3 font-display text-4xl font-semibold leading-tight tracking-tight text-admin-text md:text-5xl">
              The safety and money parts, handled.
            </h2>
          </div>
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: CreditCard, t: 'Transparent pricing', b: 'A published rate card. No surge, no hidden fees — the price you see is the price you pay.' },
              { icon: Lock, t: 'Secure payments', b: 'Payments and payouts run through vetted processors. Cards and details are never exposed.' },
              { icon: ShieldCheck, t: 'Real verification', b: 'Documents reviewed by people, not bots. Background checks before a driver ever appears.' },
              { icon: TrendingUp, t: 'Fair to drivers', b: 'Low commission and timely payouts mean better drivers stay — and show up for you.' },
            ].map((f) => (
              <div key={f.t} className="rounded-3xl border border-admin-border bg-admin-bg p-6 shadow-admin-sm">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-admin-green-soft text-admin-green-text">
                  <f.icon className="h-5 w-5" strokeWidth={2} />
                </span>
                <h3 className="mt-4 font-display text-lg font-semibold text-admin-text">{f.t}</h3>
                <p className="mt-2 font-body text-sm leading-relaxed text-admin-text-muted">{f.b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────── CTA ───────────────── */}
      <section className="relative overflow-hidden bg-admin-navy">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -right-20 -top-24 h-96 w-96 rounded-full bg-admin-green/30 blur-[120px]" />
          <div className="absolute -bottom-24 left-10 h-80 w-80 rounded-full bg-admin-green/15 blur-[120px]" />
        </div>
        <div className="relative mx-auto max-w-4xl px-5 py-24 text-center sm:px-6">
          <h2 className="font-display text-4xl font-semibold leading-tight tracking-tight text-white md:text-6xl">
            Book a driver worth having on your side.
          </h2>
          <p className="mx-auto mt-5 max-w-xl font-body text-lg text-white/70">
            Verified, transparent, and ready when you are — across Lagos and beyond.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link
              href={findDriverHref}
              className="group inline-flex items-center gap-2 rounded-full bg-admin-green px-7 py-3.5 font-body text-sm font-semibold text-white shadow-admin-glow transition-transform hover:-translate-y-0.5"
            >
              Find a driver
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2} />
            </Link>
            <Link
              href={businessHref}
              className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/5 px-7 py-3.5 font-body text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/10"
            >
              For business
            </Link>
          </div>
        </div>
      </section>

      <FintechFooter
        columns={[
          {
            heading: 'Product',
            links: [
              { href: findDriverHref, label: 'Find a driver' },
              { href: businessHref, label: 'For business' },
              { href: '/permanent', label: 'Permanent placements' },
            ],
          },
          {
            heading: 'Drivers',
            links: [
              { href: '/sign-up?role=driver', label: 'Drive with us' },
              { href: '#standards', label: 'Verification tiers' },
              { href: '#how', label: 'How it works' },
            ],
          },
          {
            heading: 'Company',
            links: [
              { href: '/sign-in', label: 'Sign in' },
              { href: '#audience', label: 'Who it’s for' },
              { href: '/permanent', label: 'Enterprise' },
            ],
          },
        ]}
      />
    </div>
  );
}
