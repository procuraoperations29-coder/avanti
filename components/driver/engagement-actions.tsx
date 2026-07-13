'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, MapPin, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';
import { nextActionFor, type DriverAction, type EngagementStatus } from '@/lib/engagement/driver-transitions';

/**
 * DriverEngagementActions — the state-transition buttons.
 *
 * Given the current status, renders the next legal button:
 *   confirmed → "I'm on my way" (activate)
 *   active    → "Complete engagement" (complete)
 *   completed / cancelled / others → nothing (or terminal notice)
 */

const ACTION_META: Record<
  DriverAction,
  {
    label: string;
    Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
    confirmPrompt: string;
    successMessage: string;
    helperText: string;
  }
> = {
  activate: {
    label: "I'm on my way",
    Icon: MapPin,
    confirmPrompt: 'Confirm you\'re heading to the pickup?',
    successMessage: 'Engagement is now active',
    helperText:
      "Tap when you're heading to the pickup or ready to start. The customer will be notified.",
  },
  complete: {
    label: 'Complete engagement',
    Icon: Check,
    confirmPrompt: 'Mark this engagement complete?',
    successMessage: 'Engagement completed',
    helperText: 'When the engagement is finished, tap to mark it complete. Payout processes on the next batch.',
  },
};

export function DriverEngagementActions({
  engagementId,
  currentStatus,
}: {
  engagementId: string;
  currentStatus: EngagementStatus;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const action = nextActionFor(currentStatus);

  if (!action) {
    if (currentStatus === 'completed') {
      return (
        <div className="border border-green bg-green-soft p-5">
          <div className="font-mono text-xs uppercase tracking-wider text-ink-muted">Complete</div>
          <p className="mt-2 font-body text-sm text-ink">
            This engagement is complete. Payout will process on the next batch.
          </p>
        </div>
      );
    }
    if (currentStatus === 'cancelled') {
      return (
        <div className="border border-oxblood/40 bg-paper-2 p-5">
          <div className="font-mono text-xs uppercase tracking-wider text-ink-muted">Cancelled</div>
        </div>
      );
    }
    if (currentStatus === 'disputed' || currentStatus === 'partially_resolved') {
      return (
        <div className="border border-oxblood/40 bg-paper-2 p-5">
          <div className="font-mono text-xs uppercase tracking-wider text-ink-muted">
            Under dispute
          </div>
          <p className="mt-2 font-body text-sm text-ink">
            This engagement is in dispute review. Payout is on hold pending resolution.
          </p>
        </div>
      );
    }
    return null;
  }

  const meta = ACTION_META[action];
  const Icon = meta.Icon;

  const submit = async () => {
    if (!window.confirm(meta.confirmPrompt)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/driver/engagements/${engagementId}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const body = (await res.json()) as { ok?: boolean; error?: string; message?: string };
      if (!res.ok) {
        toast.error(body.message ?? body.error ?? 'Action failed');
        return;
      }
      toast.success(meta.successMessage);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border border-ink bg-paper-2 p-6">
      <div className="mb-4">
        <div className="font-mono text-xs uppercase tracking-wider text-ink-muted">Next</div>
        <p className="mt-1 font-body text-sm text-ink">{meta.helperText}</p>
      </div>
      <Button onClick={submit} disabled={busy} size="lg" className="w-full">
        {busy ? (
          <Loader2 className="mr-2 h-5 w-5 animate-spin" strokeWidth={1.5} />
        ) : (
          <Icon className="mr-2 h-5 w-5" strokeWidth={1.5} />
        )}
        {busy ? 'Working…' : meta.label}
      </Button>
    </div>
  );
}
