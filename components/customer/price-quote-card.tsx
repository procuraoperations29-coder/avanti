import { SectionLabel } from '@/components/avanti/section-label';
import { SpecRow } from '@/components/avanti/spec-row';
import { cn } from '@/lib/utils/cn';

/**
 * PriceQuoteCard — shows the customer-visible price breakdown.
 *
 * CRITICAL: this view NEVER shows driver payout or commission —
 * information isolation invariant (Phase 3 D26).
 */

export interface PriceQuoteCardProps {
  currency: string;
  base: number;
  overtime: number;
  vat: number;
  customerTotal: number;
  breakdown: {
    unit: 'hour' | 'day';
    unitCount: number;
    unitPrice: number;
    overtimeHours: number;
    overtimeMultiplier: number;
  };
  expiresAt: string;
  className?: string;
}

function formatNaira(n: number): string {
  return `₦${n.toLocaleString('en-NG')}`;
}

export function PriceQuoteCard({
  currency,
  base,
  overtime,
  vat,
  customerTotal,
  breakdown,
  expiresAt,
  className,
}: PriceQuoteCardProps) {
  const expiresMinutes = Math.max(
    0,
    Math.round((new Date(expiresAt).getTime() - Date.now()) / 60000)
  );

  return (
    <div className={cn('border border-line bg-paper-2 p-5', className)}>
      <SectionLabel>Price</SectionLabel>
      <div className="mt-3 mb-4">
        <div className="font-display text-4xl leading-none text-ink">
          {formatNaira(customerTotal)}
        </div>
        <div className="mt-2 font-mono text-[10px] uppercase tracking-wider text-ink-muted">
          Total · {currency} · expires in {expiresMinutes} min
        </div>
      </div>

      <dl className="border-t border-line pt-2">
        <SpecRow
          label={`${breakdown.unit === 'hour' ? 'Hours' : 'Days'} × rate`}
          value={`${breakdown.unitCount} × ${formatNaira(breakdown.unitPrice)}`}
          variant="mono"
        />
        <SpecRow label="Base" value={formatNaira(base)} variant="mono" />
        {overtime > 0 && (
          <SpecRow
            label={`Overtime (${breakdown.overtimeHours}h × ${breakdown.overtimeMultiplier}×)`}
            value={formatNaira(overtime)}
            variant="mono"
          />
        )}
        <SpecRow label="VAT (7.5%)" value={formatNaira(vat)} variant="mono" />
      </dl>
    </div>
  );
}
