'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Check, HelpCircle, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AdminSectionLabel } from '@/components/avanti/admin/page-header';
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
    <div
      className={cn(
        'rounded-2xl border border-admin-border bg-admin-card p-6 shadow-admin',
        className
      )}
    >
      <AdminSectionLabel>Decision</AdminSectionLabel>
      <h2 className="mb-4 mt-1 font-display text-2xl font-semibold tracking-tight text-admin-text">
        Your call.
      </h2>

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
          tone="amber"
        />
        <DecisionButton
          selected={decision === 'reject'}
          onClick={() => setDecision('reject')}
          Icon={X}
          label="Reject"
          tone="red"
        />
      </div>

      {decision === 'approve' && (
        <div className="mb-4">
          <Label className="text-admin-text">Assigned tier</Label>
          <div className="mt-2 grid gap-2 sm:grid-cols-4">
            {TIER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTier(opt.value)}
                type="button"
                className={cn(
                  'rounded-xl border p-3 text-left transition-all',
                  tier === opt.value
                    ? 'border-admin-green bg-admin-green-soft shadow-admin-sm'
                    : 'border-admin-border bg-admin-bg hover:border-admin-green/40'
                )}
              >
                <div className="mb-1">
                  <TierBadge tier={opt.value} label="short" size="sm" />
                </div>
                <div className="font-body text-xs text-admin-text-muted">{opt.description}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <Label htmlFor="rationale" className="text-admin-text">
          Rationale · required, minimum 10 characters
        </Label>
        <Textarea
          id="rationale"
          className="mt-2 border-admin-border bg-admin-bg text-admin-text placeholder:text-admin-text-muted focus:border-admin-green focus:ring-2 focus:ring-admin-green/20"
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
        <div className="mt-1.5 flex items-center gap-1.5 font-body text-[11px] font-medium uppercase tracking-wide text-admin-text-muted">
          <AlertTriangle className="h-3 w-3" />
          Rationale is logged permanently.
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <Button
          onClick={submit}
          disabled={!canSubmit || submitting}
          className="border-admin-navy bg-admin-navy text-white shadow-admin-sm hover:bg-admin-navy-2"
        >
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
  Icon: LucideIcon;
  label: string;
  tone: 'green' | 'amber' | 'red';
}) {
  const toneClass =
    tone === 'green'
      ? selected
        ? 'border-admin-green bg-admin-green text-admin-navy-2 shadow-admin-glow'
        : 'border-admin-green/40 bg-admin-green-soft text-admin-green-text hover:border-admin-green'
      : tone === 'amber'
        ? selected
          ? 'border-admin-amber bg-admin-amber text-white shadow-admin-sm'
          : 'border-admin-amber/40 bg-admin-amber-soft text-admin-amber-text hover:border-admin-amber'
        : selected
          ? 'border-red-500 bg-red-500 text-white shadow-admin-sm'
          : 'border-red-500/40 bg-red-500/10 text-red-600 hover:border-red-500';

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-1 rounded-xl border p-3 font-medium transition-all',
        toneClass
      )}
    >
      <Icon className="h-5 w-5" strokeWidth={2} />
      <span className="font-body text-sm">{label}</span>
    </button>
  );
}
