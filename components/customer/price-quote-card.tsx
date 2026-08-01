import { AdminSectionLabel, AdminSpecRow } from '@/components/avanti/admin/page-header';
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
    <div
      className={cn(
        'rounded-2xl border border-admin-border bg-admin-card p-5 shadow-admin',
        className
      )}
    >
      <AdminSectionLabel>Price</AdminSectionLabel>
      <div className="mt-1 mb-4">
        <div className="font-display text-4xl font-semibold leading-none tabular-nums tracking-tight text-admin-text">
          {formatNaira(customerTotal)}
        </div>
        <div className="mt-2 font-body text-[12px] text-admin-text-muted">
          Total · {currency} · expires in{' '}
          <span className="font-medium tabular-nums text-admin-text">{expiresMinutes}</span> min
        </div>
      </div>

      <dl className="border-t border-admin-border pt-1">
        <AdminSpecRow
          label={`${breakdown.unit === 'hour' ? 'Hours' : 'Days'} × rate`}
          value={`${breakdown.unitCount} × ${formatNaira(breakdown.unitPrice)}`}
          variant="mono"
        />
        <AdminSpecRow label="Base" value={formatNaira(base)} variant="mono" />
        {overtime > 0 && (
          <AdminSpecRow
            label={`Overtime (${breakdown.overtimeHours}h × ${breakdown.overtimeMultiplier}×)`}
            value={formatNaira(overtime)}
            variant="mono"
          />
        )}
        <AdminSpecRow label="VAT (7.5%)" value={formatNaira(vat)} variant="mono" />
      </dl>
    </div>
  );
}
