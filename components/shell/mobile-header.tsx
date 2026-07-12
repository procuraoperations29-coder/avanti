'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

/**
 * MobileHeader — a slim, back-button-first header for flow screens
 * (signup steps, contract detail, booking wizard). Use in place of TopNav
 * on deep-linked mobile screens where the primary action is going back.
 */

export interface MobileHeaderProps {
  title?: string;
  backTo?: string;
  onBack?: () => void;
  actions?: React.ReactNode;
  className?: string;
}

export function MobileHeader({
  title,
  backTo,
  onBack,
  actions,
  className,
}: MobileHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    if (backTo) {
      router.push(backTo);
      return;
    }
    router.back();
  };

  return (
    <header
      className={cn(
        'sticky top-0 z-30 flex h-12 items-center justify-between border-b border-line bg-paper/95 px-4 backdrop-blur',
        className
      )}
    >
      {backTo && !onBack ? (
        <Link
          href={backTo}
          className="inline-flex items-center gap-1 font-mono text-xs uppercase tracking-wider text-ink-muted hover:text-ink"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Back
        </Link>
      ) : (
        <button
          onClick={handleBack}
          className="inline-flex items-center gap-1 font-mono text-xs uppercase tracking-wider text-ink-muted hover:text-ink"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Back
        </button>
      )}

      {title && (
        <div className="font-mono text-xs uppercase tracking-wider text-ink">{title}</div>
      )}

      <div className="min-w-[3.5rem] text-right">{actions}</div>
    </header>
  );
}
