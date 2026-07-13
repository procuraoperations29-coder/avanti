import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthUser, AuthError } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { verifyTransaction } from '@/lib/payments/paystack';

/**
 * POST /api/payments/paystack/verify
 * Body: { reference }
 *
 * Called by the client after Paystack redirects back to the callback URL.
 * Verifies the transaction with Paystack (or accepts the mock in dev),
 * updates payment.status = 'captured', and moves engagement.status
 * 'draft' → 'confirmed' — which triggers the price-lock (Slice 2) to
 * copy quote totals onto the engagement.
 *
 * Idempotent: safe to call repeatedly (webhook and callback both do it).
 */

const bodySchema = z.object({
  reference: z.string().min(3),
});

export async function POST(req: Request) {
  try {
    await requireAuthUser();

    let body: z.infer<typeof bodySchema>;
    try {
      body = bodySchema.parse(await req.json());
    } catch (err) {
      return NextResponse.json({ error: 'invalid_body', details: String(err) }, { status: 400 });
    }

    const admin = createServiceRoleClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: payment, error: payErr } = await (admin as any)
      .from('payments')
      .select('*')
      .eq('provider_ref', body.reference)
      .single();
    if (payErr || !payment) {
      return NextResponse.json({ error: 'payment_not_found' }, { status: 404 });
    }

    // Already captured — idempotent success
    if (payment.status === 'captured') {
      return NextResponse.json({ ok: true, status: 'captured', engagementId: payment.engagement_id });
    }

    // Verify with Paystack (or accept mock)
    const verified = await verifyTransaction(body.reference);
    if (verified.status !== 'success') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (admin as any)
        .from('payments')
        .update({ status: 'failed', failure_reason: verified.status })
        .eq('id', payment.id);
      return NextResponse.json({ error: 'payment_not_successful', status: verified.status }, { status: 400 });
    }

    // Mark payment captured
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updPayErr } = await (admin as any)
      .from('payments')
      .update({
        status: 'captured',
        captured_at: new Date().toISOString(),
        authorized_at: new Date().toISOString(),
      })
      .eq('id', payment.id);
    if (updPayErr) {
      return NextResponse.json(
        { error: 'payment_update_failed', message: updPayErr.message },
        { status: 500 }
      );
    }

    // Confirm the engagement. The Slice 2 price-lock trigger will copy
    // the price_quote totals onto the engagement in this transaction.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: engErr } = await (admin as any)
      .from('engagements')
      .update({
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
      })
      .eq('id', payment.engagement_id);
    if (engErr) {
      return NextResponse.json(
        { error: 'engagement_confirm_failed', message: engErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      status: 'captured',
      engagementId: payment.engagement_id,
      mock: verified.mock,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.code }, { status: err.status });
    }
    console.error('[paystack/verify]', err);
    return NextResponse.json(
      { error: 'verify_failed', message: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
