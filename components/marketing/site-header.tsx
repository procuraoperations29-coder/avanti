import Link from 'next/link';
import { Logo } from '@/components/brand/logo';

export interface SiteHeaderProps {
  isSignedIn: boolean;
  /** Where the "Continue" link sends a signed-in visitor (role home). */
  continueHref?: string;
  navLinks?: { href: string; label: string }[];
}

/**
 * Shared header for public marketing pages (homepage, /permanent, ...).
 * Keeps the wordmark/nav consistent across pages instead of each page
 * hand-rolling its own copy.
 */
export function SiteHeader({ isSignedIn, continueHref = '/customer', navLinks = [] }: SiteHeaderProps) {
  return (
    <header className="border-b border-line">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/">
          <Logo />
        </Link>
        <nav className="flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="hidden font-mono text-xs uppercase tracking-wider text-ink-muted hover:text-ink sm:inline"
            >
              {link.label}
            </Link>
          ))}
          {isSignedIn ? (
            <Link
              href={continueHref}
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
  );
}
