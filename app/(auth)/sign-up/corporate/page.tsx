import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { SectionLabel } from '@/components/avanti/section-label';

export default function CorporateSignUpPage() {
  return (
    <div className="mx-auto max-w-md px-4 pt-16 sm:px-6">
      <Link
        href="/"
        className="mb-8 inline-flex items-center gap-1 font-mono text-xs uppercase tracking-wider text-ink-muted hover:text-ink"
      >
        <ChevronLeft className="h-3.5 w-3.5" /> Back to home
      </Link>

      <SectionLabel>Corporate sign-up</SectionLabel>
      <h1 className="mb-6 mt-3 font-display text-4xl leading-tight text-ink">
        Not yet.
      </h1>

      <p className="max-w-md font-body leading-relaxed text-ink-muted">
        Corporate onboarding lands in Slice 3 with the rest of the auth
        surface. See <span className="font-mono">docs/setup.md</span>.
      </p>
    </div>
  );
}
