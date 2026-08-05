'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Check } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/button';

/**
 * AvailabilityToggle — driver picks whether they take on-demand jobs,
 * permanent placements, or both.
 *
 * At least one must be true. If a driver toggles both off, the save
 * button is disabled with a note.
 */

export function AvailabilityToggle({
  initialOnDemand,
  initialPermanent,
  monthlySalary,
}: {
  initialOnDemand: boolean;
  initialPermanent: boolean;
  monthlySalary: number;
}) {
  const router = useRouter();
  const [onDemand, setOnDemand] = useState(initialOnDemand);
  const [permanent, setPermanent] = useState(initialPermanent);
  const [busy, setBusy] = useState(false);

  const dirty = onDemand !== initialOnDemand || permanent !== initialPermanent;
  const bothOff = !onDemand && !permanent;

  const save = async () => {
    if (bothOff) return;
    setBusy(true);
    try {
      const res = await fetch('/api/driver/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          availableOnDemand: onDemand,
          availablePermanent: permanent,
        }),
      });
      const body = (await res.json()) as { ok?: boolean; error?: string; message?: string };
      if (!res.ok) {
        toast.error(body.message ?? body.error ?? 'Update failed');
        return;
      }
      toast.success('Availability updated');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setBusy(false);
    }
  };

  const formatNaira = (n: number) => `₦${n.toLocaleString('en-NG')}`;

  return (
    <div className="border border-line bg-paper-2 p-6">
      <div className="mb-4 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
        Your availability
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          onClick={() => setOnDemand((v) => !v)}
          className={cn(
            'flex items-start gap-3 border p-4 text-left transition-colors',
            onDemand
              ? 'border-ink bg-paper text-ink'
              : 'border-line-strong bg-paper text-ink-muted hover:bg-paper-3'
          )}
        >
          <div
            className={cn(
              'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center border-2 transition-colors',
              onDemand ? 'border-ink bg-ink' : 'border-line-strong bg-paper'
            )}
          >
            {onDemand && <Check className="h-3 w-3 text-paper" strokeWidth={3} />}
          </div>
          <div className="flex-1">
            <div className="font-body text-base text-ink">On-demand</div>
            <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-ink-muted">
              Hourly and daily bookings
            </div>
          </div>
        </button>

        <button
          onClick={() => setPermanent((v) => !v)}
          className={cn(
            'flex items-start gap-3 border p-4 text-left transition-colors',
            permanent
              ? 'border-ink bg-paper text-ink'
              : 'border-line-strong bg-paper text-ink-muted hover:bg-paper-3'
          )}
        >
          <div
            className={cn(
              'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center border-2 transition-colors',
              permanent ? 'border-ink bg-ink' : 'border-line-strong bg-paper'
            )}
          >
            {permanent && <Check className="h-3 w-3 text-paper" strokeWidth={3} />}
          </div>
          <div className="flex-1">
            <div className="font-body text-base text-ink">Permanent placement</div>
            <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-ink-muted">
              {formatNaira(monthlySalary)}/month · take-home after 15%
            </div>
          </div>
        </button>
      </div>

      {bothOff && (
        <p className="mt-4 font-mono text-[10px] uppercase tracking-wider text-oxblood">
          Select at least one
        </p>
      )}

      {dirty && (
        <div className="mt-4 flex items-center gap-3">
          <Button onClick={save} disabled={busy || bothOff} size="sm">
            {busy ? (
              <>
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
                Saving…
              </>
            ) : (
              'Save changes'
            )}
          </Button>
          <button
            onClick={() => {
              setOnDemand(initialOnDemand);
              setPermanent(initialPermanent);
            }}
            className="font-mono text-xs uppercase tracking-wider text-ink-muted hover:text-ink"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
