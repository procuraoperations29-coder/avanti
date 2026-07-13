import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { verifyWebhookSignature, verifyTransaction, paystackConfigured } from '@/lib/payments/paystack';

/**
 * POST /api/payments/paystack/webhook
 *
 * Belt-and-suspenders alongside the /verify route. Paystack sends webhook
 * events; we verify the signature, re-verify with Paystack (never trust
 * webhook payload alone), and idempotently confirm the engagement.
 *
 * Configure this URL in Paystack Dashboard → Settings → Webhooks
 * (production only — dev doesn't get webhooks).
 */

export async function POST(req: Request) {
  if (!paystackConfigured()) {
    return NextResponse.json({ ok: true, skipped: 'paystack_not_configured' });
  }

  const rawBody = await req.text();
  const signature = req.headers.get('x-paystack-signature') ?? '';

  const valid = await verifyWebhookSignature(rawBody, signature);
  if (!valid) {
    return NextResponse.json({ error: 'invalid_signature' }, { status: 401 });
  }

  let event: { event: string; data: { reference: string; status: string } };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (event.event !== 'charge.success') {
    // We only care about successful charges here
    return NextResponse.json({ ok: true, ignored: event.event });
  }

  // Re-verify with Paystack (don't trust the payload).
  const verified = await verifyTransaction(event.data.reference);
  if (verified.status !== 'success') {
    return NextResponse.json({ ok: true, skipped: 'not_success' });
  }

  // Idempotent update. If payment already captured, no-op.
  const admin = createServiceRoleClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: payment } = await (admin as any)
    .from('payments')
    .select('*')
    .eq('provider_ref', event.data.reference)
    .single();

  if (!payment) return NextResponse.json({ ok: true, skipped: 'payment_not_found' });
  if (payment.status === 'captured') {
    return NextResponse.json({ ok: true, already: 'captured' });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin as any)
    .from('payments')
    .update({
      status: 'captured',
      captured_at: new Date().toISOString(),
      authorized_at: new Date().toISOString(),
    })
    .eq('id', payment.id);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin as any)
    .from('engagements')
    .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
    .eq('id', payment.engagement_id)
    .neq('status', 'confirmed');

  return NextResponse.json({ ok: true });
}
