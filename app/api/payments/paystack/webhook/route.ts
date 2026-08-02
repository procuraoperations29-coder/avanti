import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { verifyWebhookSignature, verifyTransaction, paystackConfigured } from '@/lib/payments/paystack';
import { notifyEngagementEvent } from '@/lib/email/engagement-notify';
import { sendPaymentReceipt } from '@/lib/email/payment-receipt';

function formatNaira(n: number): string {
  return `₦${Math.round(n).toLocaleString('en-NG')}`;
}

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
    return NextResponse.json({ ok: true, ignored: event.event });
  }

  const verified = await verifyTransaction(event.data.reference);
  if (verified.status !== 'success') {
    return NextResponse.json({ ok: true, skipped: 'not_success' });
  }

  const admin = createServiceRoleClient();

  // ── Engagement bookings (existing flow) ──
  const { data: payment } = await admin
    .from('payments')
    .select('*')
    .eq('provider_ref', event.data.reference)
    .single();

  if (payment) {
    if (payment.status === 'captured') {
      return NextResponse.json({ ok: true, already: 'captured' });
    }

    await admin
      .from('payments')
      .update({
        status: 'captured',
        captured_at: new Date().toISOString(),
        authorized_at: new Date().toISOString(),
      })
      .eq('id', payment.id);

    await admin
      .from('engagements')
      .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
      .eq('id', payment.engagement_id!)
      .neq('status', 'confirmed');

    // Payment confirmation to the customer + Avanti ops.
    if (payment.engagement_id) {
      await notifyEngagementEvent(admin, payment.engagement_id, 'payment_confirmed');
    }

    return NextResponse.json({ ok: true });
  }

  // ── Out-of-state trip invoices (references start with TRIP-) ──
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: trip } = await (admin as any)
    .from('trip_requests')
    .select('id, payment_status, customer_user_id, offer_price, origin_city, destinations, trip_type')
    .eq('payment_reference', event.data.reference)
    .maybeSingle();

  if (trip) {
    if (trip.payment_status === 'paid') {
      return NextResponse.json({ ok: true, already: 'paid' });
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any)
      .from('trip_requests')
      .update({
        status: 'paid',
        payment_status: 'paid',
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', trip.id);

    const route = [trip.origin_city, ...(Array.isArray(trip.destinations) ? trip.destinations : [])].join(' → ');
    await sendPaymentReceipt(admin, {
      customerUserId: trip.customer_user_id,
      eyebrow: 'Trip confirmed',
      customerHeadline: 'Payment received — your trip is confirmed',
      customerParagraphs: [
        'We\'ve received your payment for your out-of-state trip. Your driver is confirmed and we\'ll be in touch with the final details.',
      ],
      opsHeadline: 'Out-of-state trip paid',
      summary: [
        { label: 'Route', value: route },
        { label: 'Total', value: formatNaira(Number(trip.offer_price ?? 0)) },
      ],
    });

    return NextResponse.json({ ok: true, trip: trip.id });
  }

  // ── Permanent placement invoices (references start with PLINV-) ──
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: plInvoice } = await (admin as any)
    .from('placement_invoices')
    .select('id, placement_id, kind, payment_status, customer_user_id, amount')
    .eq('payment_reference', event.data.reference)
    .maybeSingle();

  if (plInvoice) {
    if (plInvoice.payment_status === 'paid') {
      return NextResponse.json({ ok: true, already: 'paid' });
    }
    const nowIso = new Date().toISOString();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any)
      .from('placement_invoices')
      .update({ status: 'paid', payment_status: 'paid', paid_at: nowIso, updated_at: nowIso })
      .eq('id', plInvoice.id);

    // The upfront payment is what starts the placement.
    if (plInvoice.kind === 'upfront') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (admin as any)
        .from('placements')
        .update({ status: 'active', activated_at: nowIso, updated_at: nowIso })
        .eq('id', plInvoice.placement_id)
        .eq('status', 'pending');
    }

    await sendPaymentReceipt(admin, {
      customerUserId: plInvoice.customer_user_id,
      eyebrow: 'Placement payment',
      customerHeadline:
        plInvoice.kind === 'upfront'
          ? 'Payment received — your placement is active'
          : 'Payment received — thank you',
      customerParagraphs: [
        plInvoice.kind === 'upfront'
          ? 'We\'ve received your upfront payment. Your permanent placement is now active.'
          : 'We\'ve received your monthly placement payment. Thank you.',
      ],
      opsHeadline: plInvoice.kind === 'upfront' ? 'Placement upfront paid — now active' : 'Placement monthly paid',
      summary: [{ label: 'Amount', value: formatNaira(Number(plInvoice.amount ?? 0)) }],
    });

    return NextResponse.json({ ok: true, placementInvoice: plInvoice.id });
  }

  return NextResponse.json({ ok: true, skipped: 'reference_not_found' });
}
