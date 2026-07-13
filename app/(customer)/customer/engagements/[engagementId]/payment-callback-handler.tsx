'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from '@/components/ui/sonner';

/**
 * Client wrapper that runs on the engagement detail page when a
 * `reference` search-param is present (Paystack callback lands here).
 *
 * It POSTs to /api/payments/paystack/verify. On success, the engagement
 * flips to 'confirmed' server-side; we refresh so the page reflects it.
 *
 * A ref guard prevents double-firing (React 18 dev mode double-invokes
 * effects). If the engagement is already confirmed, we skip.
 */

export function PaymentCallbackHandler({
  reference,
  engagementId,
  initialStatus,
}: {
  reference: string;
  engagementId: string;
  initialStatus: string;
}) {
  const router = useRouter();
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;

    if (initialStatus === 'confirmed') return;

    (async () => {
      try {
        const res = await fetch('/api/payments/paystack/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reference }),
        });
        const body = (await res.json()) as {
          ok?: boolean;
          engagementId?: string;
          error?: string;
          message?: string;
          mock?: boolean;
        };
        if (!res.ok) {
          toast.error(body.message ?? body.error ?? 'Payment could not be verified');
          return;
        }
        toast.success(body.mock ? 'Mock payment confirmed' : 'Payment confirmed');

        // Strip the ?reference= from the URL and refresh the server data
        const url = new URL(window.location.href);
        url.searchParams.delete('reference');
        url.searchParams.delete('mock');
        window.history.replaceState(null, '', url.toString());
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Verification failed');
      }
    })();
  }, [reference, engagementId, initialStatus, router]);

  return null;
}
