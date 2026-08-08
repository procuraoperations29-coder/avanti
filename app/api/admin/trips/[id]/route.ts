import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthUser, AuthError } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { publicEnv } from '@/config/env';
import { initTransaction } from '@/lib/payments/paystack';
import { sendEmail } from '@/lib/email/resend';
import { tripInvoiceEmail } from '@/lib/email/templates/trip-invoice';
import { sendPushToUser } from '@/lib/push/send';

const bodySchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('review') }),
  z.object({ action: z.literal('decline') }),
  z.object({ action: z.literal('close') }),
  z.object({ action: z.literal('mark_paid') }),
  z.object({
    action: z.literal('quote'),
    driverId: z.string().uuid().nullable().optional(),
    price: z.number().positive().max(100_000_000),
    conditions: z.string().max(2000).nullable().optional(),
  }),
]);

function isTripAdmin(roles: string[]): boolean {
  return (
    roles.includes('admin_support') ||
    roles.includes('admin_verifier') ||
    roles.includes('admin_finance') ||
    roles.includes('super_admin')
  );
}

function formatNaira(n: number): string {
  return `₦${Math.round(n).toLocaleString('en-NG')}`;
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuthUser();
    if (!isTripAdmin(user.roles)) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const { id } = await ctx.params;

    let body: z.infer<typeof bodySchema>;
    try {
      body = bodySchema.parse(await req.json());
    } catch (err) {
      return NextResponse.json({ error: 'invalid_body', details: String(err) }, { status: 400 });
    }

    const admin = createServiceRoleClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: trip, error: fetchErr } = await (admin as any)
      .from('trip_requests')
      .select('*')
      .eq('id', id)
      .single();
    if (fetchErr || !trip) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    // ── Simple status transitions ──
    if (body.action === 'review' || body.action === 'decline' || body.action === 'close') {
      const status = body.action === 'review' ? 'reviewing' : body.action === 'decline' ? 'declined' : 'closed';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (admin as any)
        .from('trip_requests')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) return NextResponse.json({ error: 'update_failed', message: error.message }, { status: 500 });
      if (body.action === 'decline' && trip.customer_user_id) {
        await sendPushToUser(admin, trip.customer_user_id, { title: 'Trip request update', body: 'We couldn’t take this trip request — open Avanti for details.', url: '/customer' });
      }
      return NextResponse.json({ ok: true, status });
    }

    // ── Manual "paid" (bank transfer confirmed by hand) ──
    if (body.action === 'mark_paid') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (admin as any)
        .from('trip_requests')
        .update({
          status: 'paid',
          payment_status: 'manual_paid',
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (error) return NextResponse.json({ error: 'update_failed', message: error.message }, { status: 500 });
      if (trip.customer_user_id) {
        await sendPushToUser(admin, trip.customer_user_id, { title: 'Trip confirmed', body: 'Payment received — your out-of-state trip is confirmed.', url: '/customer' });
      }
      return NextResponse.json({ ok: true, status: 'paid' });
    }

    // ── Quote: set driver + price + conditions, raise invoice, email it ──
    // Customer contact for the invoice.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: customer } = await (admin as any)
      .from('users')
      .select('full_name, email, phone')
      .eq('id', trip.customer_user_id)
      .single();

    const customerEmail = customer?.email ?? null;
    if (!customerEmail) {
      return NextResponse.json({ error: 'customer_has_no_email' }, { status: 400 });
    }

    const reference = `TRIP-${String(id).slice(0, 8)}-${Date.now()}`;
    const callbackUrl = `${publicEnv.NEXT_PUBLIC_APP_URL ?? ''}/customer`;

    let payLink: string;
    try {
      const init = await initTransaction({
        email: customerEmail,
        amountNaira: body.price,
        reference,
        callbackUrl,
        metadata: { type: 'trip_invoice', tripRequestId: id },
      });
      payLink = init.authorizationUrl;
    } catch (err) {
      return NextResponse.json(
        { error: 'invoice_failed', message: err instanceof Error ? err.message : 'unknown' },
        { status: 502 }
      );
    }

    const destinations: string[] = Array.isArray(trip.destinations) ? trip.destinations : [];
    const route = [trip.origin_city, ...destinations].join(' → ');
    const tripSummary = `${route} · ${trip.trip_type === 'round_trip' ? 'round trip' : 'one way'}${
      trip.days ? ` · ${trip.days} day${trip.days === 1 ? '' : 's'}` : ''
    }`;

    const { subject, html } = tripInvoiceEmail({
      customerName: customer?.full_name ?? 'there',
      tripSummary,
      amountFormatted: formatNaira(body.price),
      conditions: body.conditions ?? null,
      payLink,
    });

    let emailResult: { sent: boolean; mock: boolean };
    try {
      emailResult = await sendEmail({ to: customerEmail, subject, html });
    } catch (err) {
      return NextResponse.json(
        { error: 'email_failed', message: err instanceof Error ? err.message : 'unknown' },
        { status: 502 }
      );
    }

    const now = new Date().toISOString();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updErr } = await (admin as any)
      .from('trip_requests')
      .update({
        status: 'quoted',
        assigned_driver_id: body.driverId ?? null,
        offer_price: body.price,
        offer_conditions: body.conditions ?? null,
        quoted_by: user.id,
        quoted_at: now,
        payment_reference: reference,
        payment_link: payLink,
        payment_status: 'unpaid',
        invoice_sent_at: now,
        updated_at: now,
      })
      .eq('id', id);
    if (updErr) {
      return NextResponse.json({ error: 'update_failed', message: updErr.message }, { status: 500 });
    }

    if (trip.customer_user_id) {
      await sendPushToUser(admin, trip.customer_user_id, {
        title: 'Your trip quote is ready',
        body: `${formatNaira(body.price)} for ${route}. Tap to pay and confirm.`,
        url: '/customer',
      });
    }

    return NextResponse.json({ ok: true, status: 'quoted', emailSent: emailResult.sent, emailMock: emailResult.mock, payLink });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.code }, { status: err.status });
    }
    console.error('[admin trips PATCH]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
