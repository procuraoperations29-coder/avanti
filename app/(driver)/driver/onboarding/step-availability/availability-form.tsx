'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Check, Clock, UserCheck, ArrowRight } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/button';

export function AvailabilityStepForm({
  initialOnDemand,
  initialPermanent,
}: {
  initialOnDemand: boolean;
  initialPermanent: boolean;
}) {
  const router = useRouter();
  const [onDemand, setOnDemand] = useState(initialOnDemand);
  const [permanent, setPermanent] = useState(initialPermanent);
  const [busy, setBusy] = useState(false);

  const bothOff = !onDemand && !permanent;

  const saveAndContinue = async () => {
    if (bothOff) {
      toast.error('Please select at least one option.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/driver/onboarding/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          availableOnDemand: onDemand,
          availablePermanent: permanent,
        }),
      });
      const body = (await res.json()) as { ok?: boolean; error?: string; message?: string };
      if (!res.ok) {
        toast.error(body.message ?? body.error ?? 'Save failed');
        return;
      }
      router.push('/driver/onboarding/step-payout');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      {/* Two big option cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* On-demand */}
        <button
          type="button"
          onClick={() => setOnDemand((v) => !v)}
          className={cn(
            'flex flex-col items-start gap-4 border p-6 text-left transition-colors',
            onDemand
              ? 'border-ink bg-paper text-ink'
              : 'border-line-strong bg-paper text-ink hover:bg-paper-3'
          )}
        >
          <div className="flex w-full items-start justify-between">
            <div
              className={cn(
                'flex h-10 w-10 items-center justify-center border',
                onDemand ? 'border-ink bg-paper' : 'border-line-strong bg-paper'
              )}
            >
              <Clock className="h-5 w-5" strokeWidth={1.5} />
            </div>
            <div
              className={cn(
                'flex h-6 w-6 items-center justify-center border-2 transition-colors',
                onDemand ? 'border-ink bg-ink' : 'border-line-strong bg-paper'
              )}
            >
              {onDemand && <Check className="h-3.5 w-3.5 text-paper" strokeWidth={3} />}
            </div>
          </div>

          <div>
            <div className="font-display text-2xl leading-tight text-ink">
              On-demand
            </div>
            <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
              Hourly · daily
            </div>
          </div>

          <p className="font-body text-sm leading-relaxed text-ink">
            Customers book you by the hour or day. Airport runs, events,
            evenings, errands. You accept the jobs that fit your schedule.
          </p>

          <div className="mt-auto border-t border-line pt-4 font-mono text-[10px] uppercase tracking-wider text-ink-muted">
            Paid weekly · Set your own hours
          </div>
        </button>

        {/* Permanent */}
        <button
          type="button"
          onClick={() => setPermanent((v) => !v)}
          className={cn(
            'flex flex-col items-start gap-4 border p-6 text-left transition-colors',
            permanent
              ? 'border-brass bg-brass-soft text-ink'
              : 'border-line-strong bg-paper text-ink hover:bg-paper-3'
          )}
        >
          <div className="flex w-full items-start justify-between">
            <div
              className={cn(
                'flex h-10 w-10 items-center justify-center border',
                permanent ? 'border-brass bg-paper' : 'border-line-strong bg-paper'
              )}
            >
              <UserCheck className="h-5 w-5" strokeWidth={1.5} />
            </div>
            <div
              className={cn(
                'flex h-6 w-6 items-center justify-center border-2 transition-colors',
                permanent ? 'border-brass bg-brass' : 'border-line-strong bg-paper'
              )}
            >
              {permanent && <Check className="h-3.5 w-3.5 text-paper" strokeWidth={3} />}
            </div>
          </div>

          <div>
            <div className="font-display text-2xl leading-tight text-ink">
              Permanent placement
            </div>
            <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-brass">
              Monthly salary
            </div>
          </div>

          <p className="font-body text-sm leading-relaxed text-ink">
            Placed with one household or executive on a monthly retainer. Same
            people every day. Predictable schedule. Long-term relationship.
          </p>

          <div className="mt-auto border-t border-brass/40 pt-4 font-mono text-[10px] uppercase tracking-wider text-ink-muted">
            ₦175,000–₦325,000/month · By tier
          </div>
        </button>
      </div>

      {bothOff && (
        <div className="mt-6 border-l-2 border-oxblood bg-oxblood/5 px-4 py-3">
          <div className="font-mono text-[10px] uppercase tracking-wider text-oxblood">
            Please pick at least one
          </div>
          <p className="mt-1 font-body text-sm text-ink">
            You can pick both if you&apos;re open to either — you&apos;ll show up
            for both types of customer.
          </p>
        </div>
      )}

      {/* Continue */}
      <div className="mt-10 flex items-center justify-between">
        <div className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
          Step 06 of 07
        </div>
        <Button
          onClick={saveAndContinue}
          disabled={busy || bothOff}
          size="lg"
          className="min-w-[180px]"
        >
          {busy ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" strokeWidth={1.5} />
              Saving…
            </>
          ) : (
            <>
              Continue to payout
              <ArrowRight className="ml-2 h-4 w-4" strokeWidth={1.5} />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
