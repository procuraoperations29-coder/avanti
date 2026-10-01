'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

interface PlacementPaymentFormProps {
  placementId: string;
  amount: number;
  driverName: string;
}

export function PlacementPaymentForm({
  placementId,
  amount,
  driverName,
}: PlacementPaymentFormProps) {
  const [busy, setBusy] = useState(false);

  async function handlePayment() {
    setBusy(true);
    try {
      const res = await fetch('/api/payments/paystack/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Math.round(amount),
          metadata: {
            placement_id: placementId,
            type: 'permanent_placement_upfront',
          },
          callback_url: `/customer/placements/${placementId}/payment-callback`,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Payment initiation failed');
      }

      const data = await res.json();
      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      } else {
        throw new Error('No payment link received');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Payment initiation failed');
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <button
        onClick={handlePayment}
        disabled={busy}
        className="w-full rounded-xl bg-customer-green px-6 py-3 font-body font-medium text-white hover:bg-customer-green/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
      >
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        {busy ? 'Redirecting...' : `Pay ₦${amount.toLocaleString()} & Accept Placement`}
      </button>

      <p className="text-center font-body text-xs text-customer-text-muted">
        You'll be redirected to Paystack to complete the payment securely.
      </p>
    </div>
  );
}
