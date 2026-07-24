'use client';

import { Toaster as SonnerToaster } from 'sonner';

/**
 * Sonner-powered toast provider. Mount once at the root layout.
 * Toasts are triggered by calling `toast()` from anywhere:
 *   import { toast } from 'sonner';
 *   toast.success('Saved');
 *   toast.error('Something went wrong');
 */

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      toastOptions={{
        style: {
          background: 'rgb(var(--paper-2))',
          color: 'rgb(var(--ink))',
          border: '1px solid rgb(var(--line-strong))',
          borderRadius: 'var(--radius)',
          fontFamily: 'var(--font-body)',
        },
        classNames: {
          title: 'font-body text-sm',
          description: 'font-body text-xs text-ink-muted',
        },
      }}
    />
  );
}

// Re-export the toast function for convenience
export { toast } from 'sonner';
