import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { SectionLabel } from '@/components/avanti/section-label';

export default function SignInPage() {
  return (
    <div className="mx-auto max-w-md px-4 pt-16 sm:px-6">
      <Link
        href="/"
        className="mb-8 inline-flex items-center gap-1 font-mono text-xs uppercase tracking-wider text-ink-muted hover:text-ink"
      >
        <ChevronLeft className="h-3.5 w-3.5" /> Back to home
      </Link>

      <SectionLabel>Sign in</SectionLabel>
      <h1 className="mb-6 mt-3 font-display text-4xl leading-tight text-ink">
        Not yet.
      </h1>

      <p className="max-w-md font-body leading-relaxed text-ink-muted">
        The sign-in flow lands in the next slice, once we&apos;ve applied the
        Phase 3 schema and configured Supabase Auth. See{' '}
        <span className="font-mono">docs/setup.md</span> for the roadmap.
      </p>
    </div>
  );
}
