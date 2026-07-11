import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { SectionLabel } from '@/components/avanti/section-label';
import { cn } from '@/lib/utils/cn';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 pt-24 text-center sm:px-6">
      <SectionLabel>404</SectionLabel>
      <h1 className="mb-6 mt-3 font-display text-5xl leading-tight text-ink">
        <em className="italic">Nothing here.</em>
      </h1>
      <p className="mb-8 font-body leading-relaxed text-ink-muted">
        The page you were looking for either moved or was never here.
      </p>
      <Link href="/" className={cn(buttonVariants({ variant: 'primary' }))}>
        Back to home
      </Link>
    </div>
  );
}
