import Link from 'next/link';
import { Logo } from '@/components/brand/logo';

const PRODUCT_LINKS = [
  { href: '/sign-up?role=individual', label: 'Find a driver' },
  { href: '/sign-up?role=corporate', label: 'For business' },
  { href: '/permanent', label: 'Permanent placements' },
  { href: '/sign-up?role=driver', label: 'Drive with us' },
];

/**
 * Shared footer for public marketing pages. `productLinks` can be
 * overridden per-page (e.g. swapping sign-up hrefs for signed-in
 * equivalents); defaults cover the anonymous case.
 */
export function SiteFooter({ productLinks = PRODUCT_LINKS }: { productLinks?: typeof PRODUCT_LINKS }) {
  return (
    <footer className="bg-paper">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-12 md:grid-cols-4">
          <div>
            <Logo size="sm" />
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
                <Link href="/#standards" className="hover:text-ink-2">Our standards</Link>
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
              {productLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-ink-2">{link.label}</Link>
                </li>
              ))}
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
            <Link href="/terms" className="hover:text-ink">Terms</Link>
            <Link href="/privacy" className="hover:text-ink">Privacy</Link>
            <Link href="/cookies" className="hover:text-ink">Cookies</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
