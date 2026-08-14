/**
 * Cancellation policy math (isomorphic — used for the customer preview and
 * server-side execution). Fees are a fraction of the amount the customer paid,
 * by how much notice they give before the engagement start.
 *
 *   >= cancelFreeHours notice        -> free (0%)
 *   cancelNearHours .. cancelFreeHours -> mid fee (e.g. 5%)
 *   < cancelNearHours                -> near fee (e.g. 10%)
 */

export interface CancelPolicy {
  cancelFreeHours: number;
  cancelNearHours: number;
  cancelFeeNear: number;
  cancelFeeMid: number;
}

/** Engagement statuses a customer may still cancel (before the job runs). */
export const CANCELLABLE_STATUSES = ['draft', 'requested', 'accepted', 'contract_pending', 'confirmed'];

export function hoursUntil(startISO: string | null | undefined, nowMs: number = Date.now()): number {
  if (!startISO) return Infinity;
  const s = new Date(startISO).getTime();
  if (Number.isNaN(s)) return Infinity;
  return (s - nowMs) / 3_600_000;
}

export function cancellationFeeRate(hoursUntilStart: number, p: CancelPolicy): number {
  if (hoursUntilStart >= p.cancelFreeHours) return 0;
  if (hoursUntilStart < p.cancelNearHours) return p.cancelFeeNear;
  return p.cancelFeeMid;
}

export interface CancelQuote {
  hoursUntilStart: number;
  feeRate: number;
  fee: number;
  refund: number;
}

/** amountPaid in the same currency units; returns fee + refund (paid - fee). */
export function quoteCancellation(startISO: string | null, amountPaid: number, p: CancelPolicy, nowMs: number = Date.now()): CancelQuote {
  const h = hoursUntil(startISO, nowMs);
  const feeRate = cancellationFeeRate(h, p);
  const fee = Math.round(amountPaid * feeRate);
  return { hoursUntilStart: h, feeRate, fee, refund: Math.max(0, amountPaid - fee) };
}
