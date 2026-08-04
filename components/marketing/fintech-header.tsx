'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X, ArrowRight } from 'lucide-react';
import { Logo } from '@/components/brand/logo';

export interface FintechHeaderProps {
  isSignedIn: boolean;
  continueHref?: string;
  primaryHref: string;
  navLinks?: { href: string; label: string }[];
}

/**
 * Marketing header for the fintech landing. Glassy, sticky, theme-aware
 * (admin-* tokens → light + dark). Collapses to a sheet on mobile.
 */
export function FintechHeader({ isSignedIn, continueHref = '/customer', primaryHref, navLinks = [] }: FintechHeaderProps) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-admin-border/70 bg-admin-bg/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-6">
        <Link href="/" className="leading-none">
          <Logo size="sm" />
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((l) => (
            <Link key={l.href} href={l.href} className="font-body text-sm text-admin-text-muted transition-colors hover:text-admin-text">
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {isSignedIn ? (
            <Link href={continueHref} className="font-body text-sm font-medium text-admin-text transition-colors hover:text-admin-green-text">
              Continue →
            </Link>
          ) : (
            <Link href="/sign-in" className="font-body text-sm font-medium text-admin-text transition-colors hover:text-admin-green-text">
              Sign in
            </Link>
          )}
          <Link
            href={primaryHref}
            className="inline-flex items-center gap-1.5 rounded-full bg-admin-green px-4 py-2 font-body text-sm font-semibold text-white shadow-admin-sm transition-transform hover:-translate-y-0.5"
          >
            Get started
            <ArrowRight className="h-4 w-4" strokeWidth={2} />
          </Link>
        </div>

        <button
          onClick={() => setOpen((v) => !v)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-admin-border text-admin-text md:hidden"
          aria-label="Menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-admin-border bg-admin-card md:hidden">
          <div className="mx-auto max-w-6xl space-y-1 px-5 py-4">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="block rounded-lg px-3 py-2.5 font-body text-sm text-admin-text hover:bg-admin-bg"
              >
                {l.label}
              </Link>
            ))}
            <div className="flex gap-3 pt-2">
              <Link
                href={isSignedIn ? continueHref : '/sign-in'}
                className="flex-1 rounded-xl border border-admin-border px-4 py-2.5 text-center font-body text-sm font-medium text-admin-text"
              >
                {isSignedIn ? 'Continue' : 'Sign in'}
              </Link>
              <Link
                href={primaryHref}
                className="flex-1 rounded-xl bg-admin-green px-4 py-2.5 text-center font-body text-sm font-semibold text-white"
              >
                Get started
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
