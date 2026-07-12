'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Check, HelpCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SectionLabel } from '@/components/avanti/section-label';
import { TierBadge, type TierLevel } from '@/components/avanti/tier-badge';
import { toast } from '@/components/ui/sonner';
import { cn } from '@/lib/utils/cn';

/**
 * DecisionPanel — approve, reject, or ask for more info.
 *
 * Every decision requires a rationale (10+ chars, enforced server-side
 * via serviceRoleWrite). Approvals also require choosing a tier.
 */

export interface DecisionPanelProps {
  driverId: string;
  className?: string;
}

const TIER_OPTIONS: { value: TierLevel; label: string; description: string }[] = [
  { value: 't1', label: 'T1', description: 'Identity only' },
  { value: 't2', label: 'T2', description: 'Standard' },
  { value: 't3', label: 'T3', description: 'Professional' },
  { value: 't4', label: 'T4', description: 'Executive' },
];

export function DecisionPanel({ driverId, className }: DecisionPanelProps) {
  const router = useRouter();
  const [decision, setDecision] = useState<'approve' | 'reject' | 'more_info' | null>(null);
  const [tier, setTier] = useState<TierLevel>('t2');
  const [rationale, setRationale] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canSubmit =
    decision !== null &&
    rationale.trim().length >= 10 &&
    (decision !== 'approve' || tier !== null);

  const submit = async () => {
    if (!decision) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/verification/${driverId}/decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision,
          rationale: rationale.trim(),
          tier: decision === 'approve' ? tier : undefined,
        }),
      });
      const body = (await res.json()) as { error?: string; message?: string };
      if (!res.ok) {
        toast.error(body.message ?? body.error ?? 'Decision failed');
        return;
      }
      toast.success(
        decision === 'approve'
          ? `Approved at ${tier.toUpperCase()}`
          : decision === 'reject'
          ? 'Rejected'
          : 'More info requested'
      );
      router.push('/admin/verification');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Decision failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={cn('border border-ink bg-paper-2 p-6', className)}>
      <SectionLabel>Decision</SectionLabel>
      <h2 className="mb-4 mt-2 font-display text-2xl leading-tight text-ink">Your call.</h2>

      <div className="mb-4 grid gap-2 sm:grid-cols-3">
        <DecisionButton
          selected={decision === 'approve'}
          onClick={() => setDecision('approve')}
          Icon={Check}
          label="Approve"
          tone="green"
        />
        <DecisionButton
          selected={decision === 'more_info'}
          onClick={() => setDecision('more_info')}
          Icon={HelpCircle}
          label="Request info"
          tone="brass"
        />
        <DecisionButton
          selected={decision === 'reject'}
          onClick={() => setDecision('reject')}
          Icon={X}
          label="Reject"
          tone="oxblood"
        />
      </div>

      {decision === 'approve' && (
        <div className="mb-4">
          <Label>Assigned tier</Label>
          <div className="mt-2 grid gap-2 sm:grid-cols-4">
            {TIER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTier(opt.value)}
                type="button"
                className={cn(
                  'border p-3 text-left transition-colors',
                  tier === opt.value
                    ? 'border-ink bg-ink text-paper'
                    : 'border-line-strong bg-paper hover:bg-paper-3'
                )}
              >
                <div className="mb-1">
                  <TierBadge tier={opt.value} label="short" size="sm" />
                </div>
                <div className="font-body text-xs">{opt.description}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <Label htmlFor="rationale">
          Rationale · required, minimum 10 characters
        </Label>
        <Textarea
          id="rationale"
          className="mt-2"
          rows={4}
          placeholder={
            decision === 'reject'
              ? 'e.g. Licence expired last year; no valid renewal on file.'
              : decision === 'more_info'
              ? 'e.g. Address proof is illegible. Please re-upload a clearer photo.'
              : "e.g. All documents check out. Bio confirms 6+ years chauffeuring in Lagos. Tier 3 fits."
          }
          value={rationale}
          onChange={(e) => setRationale(e.target.value)}
        />
        <div className="mt-1 flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-ink-muted">
          <AlertTriangle className="h-3 w-3" />
          Rationale is logged permanently.
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <Button onClick={submit} disabled={!canSubmit || submitting}>
          {submitting ? 'Submitting…' : 'Submit decision'}
        </Button>
      </div>
    </div>
  );
}

function DecisionButton({
  selected,
  onClick,
  Icon,
  label,
  tone,
}: {
  selected: boolean;
  onClick: () => void;
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  tone: 'green' | 'brass' | 'oxblood';
}) {
  const toneClass =
    tone === 'green'
      ? selected
        ? 'border-green bg-green text-paper'
        : 'border-green/50 bg-green-soft text-ink hover:bg-paper-3'
      : tone === 'brass'
      ? selected
        ? 'border-brass bg-brass text-paper'
        : 'border-brass/50 bg-brass-soft text-ink hover:bg-paper-3'
      : selected
      ? 'border-oxblood bg-oxblood text-paper'
      : 'border-oxblood/50 bg-paper text-ink hover:bg-paper-3';

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-1 border p-3 transition-colors',
        toneClass
      )}
    >
      <Icon className="h-5 w-5" strokeWidth={1.5} />
      <span className="font-body text-sm">{label}</span>
    </button>
  );
}
