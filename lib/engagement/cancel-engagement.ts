import 'server-only';
import { getPricingSettings } from '@/lib/pricing/settings';
import { quoteCancellation } from '@/lib/engagement/cancellation';
import { refundTransaction } from '@/lib/payments/paystack';

export interface CancelEngagementInput {
  id: string;
  starts_at: string | null;
  customer_price_total: number | null;
}

export interface CancelEngagementResult {
  amountPaid: number;
  fee: number;
  refund: number;
  refundProcessed: boolean;
}

/**
 * Cancel an on-demand engagement: compute the cancellation fee (unless an admin
 * forces a full refund), auto-refund the eligible amount via Paystack, and
 * record it on the engagement + payments + refunds. Idempotent-ish: callers
 * must check the status is cancellable first.
 */
export async function cancelEngagement(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  eng: CancelEngagementInput,
  opts: { actorUserId: string; reason: string; forceFullRefund?: boolean }
): Promise<CancelEngagementResult> {
  const now = new Date().toISOString();
  const settings = await getPricingSettings();

  const { data: payment } = await admin
    .from('payments')
    .select('id, provider_ref, gross_amount, status, refunded_amount')
    .eq('engagement_id', eng.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const captured = payment && ['captured', 'partially_refunded'].includes(payment.status);
  const amountPaid = captured ? Number(payment.gross_amount) : 0;

  let fee = 0;
  let refund = 0;
  if (opts.forceFullRefund) {
    fee = 0;
    refund = amountPaid;
  } else {
    const q = quoteCancellation(eng.starts_at, amountPaid, settings);
    fee = q.fee;
    refund = q.refund;
  }

  let refundId: string | null = null;
  let refundedAt: string | null = null;
  let refundProcessed = false;

  if (refund > 0 && captured && payment.provider_ref) {
    const res = await refundTransaction(payment.provider_ref, refund);
    const { data: refRow } = await admin
      .from('refunds')
      .insert({
        payment_id: payment.id,
        amount: refund,
        reason: opts.reason || 'cancellation',
        status: res.ok ? 'processed' : 'pending',
        provider_ref: res.providerRef,
        requested_by: opts.actorUserId,
        processed_at: res.ok ? now : null,
      })
      .select('id')
      .single();
    refundId = refRow?.id ?? null;
    if (res.ok) {
      refundedAt = now;
      refundProcessed = true;
      const newRefunded = (Number(payment.refunded_amount) || 0) + refund;
      await admin
        .from('payments')
        .update({ refunded_amount: newRefunded, refunded_at: now, status: newRefunded >= amountPaid ? 'refunded' : 'partially_refunded' })
        .eq('id', payment.id);
    }
  }

  await admin
    .from('engagements')
    .update({
      status: 'cancelled',
      cancelled_at: now,
      cancelled_reason: opts.reason,
      cancelled_by_user_id: opts.actorUserId,
      cancellation_fee: fee,
      refund_amount: refund,
      refunded_at: refundedAt,
      refund_id: refundId,
      updated_at: now,
    })
    .eq('id', eng.id);

  return { amountPaid, fee, refund, refundProcessed };
}
