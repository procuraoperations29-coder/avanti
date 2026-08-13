import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthUser, AuthError } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { initTransaction } from '@/lib/payments/paystack';
import { publicEnv } from '@/config/env';
import { sendEmail } from '@/lib/email/resend';
import { sendPushToUser } from '@/lib/push/send';
import { formatNaira } from '@/lib/permanent/salary';
import { computeCarHireQuote, daysBetween } from '@/lib/carhire/quote';
import { getPricingSettings } from '@/lib/pricing/settings';
import { canManageCarHire } from '../../partners/route';

/** Push the assigned driver (driver_profiles.id → user_id), best-effort. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function notifyAssignedDriver(A: any, driverProfileId: string | null | undefined, msg: { title: string; body: string }) {
  if (!driverProfileId) return;
  try {
    const { data: dp } = await A.from('driver_profiles').select('user_id').eq('id', driverProfileId).single();
    if (dp?.user_id) await sendPushToUser(A, dp.user_id, { ...msg, url: '/driver/car-hire' });
  } catch { /* best-effort */ }
}

const bodySchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('review') }),
  z.object({ action: z.literal('decline'), reason: z.string().max(500).optional() }),
  z.object({ action: z.literal('cancel') }),
  z.object({ action: z.literal('activate') }),
  z.object({ action: z.literal('complete') }),
  z.object({ action: z.literal('mark_paid') }),
  z.object({
    action: z.literal('quote'),
    assignedDriverId: z.string().uuid().nullable().optional(),
    // optional ops overrides; when omitted, computed from the vehicle
    offerTotal: z.number().min(0).max(1_000_000_000).optional(),
    offerConditions: z.string().max(2000).optional(),
    adminNotes: z.string().max(2000).optional(),
  }),
]);

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuthUser();
    if (!canManageCarHire(user.roles)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    const { id } = await ctx.params;

    let body: z.infer<typeof bodySchema>;
    try {
      body = bodySchema.parse(await req.json());
    } catch (err) {
      return NextResponse.json({ error: 'invalid_body', details: String(err) }, { status: 400 });
    }

    const admin = createServiceRoleClient();
    const now = new Date().toISOString();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const A = admin as any;

    const { data: booking } = await A.from('car_hire_bookings').select('*').eq('id', id).single();
    if (!booking) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    if (body.action === 'review') {
      await A.from('car_hire_bookings').update({ status: 'reviewing', updated_at: now }).eq('id', id);
      return NextResponse.json({ ok: true });
    }

    if (body.action === 'decline') {
      await A.from('car_hire_bookings').update({ status: 'declined', admin_notes: body.reason ?? null, updated_at: now }).eq('id', id);
      return NextResponse.json({ ok: true });
    }

    if (body.action === 'cancel') {
      await A.from('car_hire_bookings').update({ status: 'cancelled', updated_at: now }).eq('id', id);
      return NextResponse.json({ ok: true });
    }

    if (body.action === 'activate' || body.action === 'complete') {
      await A.from('car_hire_bookings').update({ status: body.action === 'activate' ? 'active' : 'completed', updated_at: now }).eq('id', id);
      return NextResponse.json({ ok: true });
    }

    if (body.action === 'mark_paid') {
      await A.from('car_hire_bookings')
        .update({ payment_status: 'manual_paid', status: 'paid', paid_at: now, updated_at: now })
        .eq('id', id);
      await notifyAssignedDriver(A, booking.assigned_driver_id, {
        title: 'Car hire confirmed',
        body: 'A car-hire job you\'re assigned to is now confirmed — check the details.',
      });
      return NextResponse.json({ ok: true });
    }

    // ── quote: recompute from the vehicle, assign driver, raise Paystack invoice ──
    if (!booking.vehicle_id) return NextResponse.json({ error: 'no_vehicle', message: 'Booking has no vehicle' }, { status: 400 });

    const { data: vehicle } = await A.from('hire_vehicles').select('*').eq('id', booking.vehicle_id).single();
    if (!vehicle) return NextResponse.json({ error: 'vehicle_missing' }, { status: 400 });

    const days = booking.days ?? daysBetween(booking.start_date, booking.end_date);
    const vatRate = (await getPricingSettings()).vatRate;
    const q = computeCarHireQuote(
      {
        daily_rate: Number(vehicle.daily_rate),
        partner_daily_cost: Number(vehicle.partner_daily_cost),
        driver_daily_rate: Number(vehicle.driver_daily_rate),
        driver_daily_pay: Number(vehicle.driver_daily_pay),
        included_hours_per_day: Number(vehicle.included_hours_per_day),
        overtime_hourly_rate: vehicle.overtime_hourly_rate != null ? Number(vehicle.overtime_hourly_rate) : null,
        min_days: Number(vehicle.min_days),
      },
      { days, hoursPerDay: Number(booking.hours_per_day) },
      vatRate
    );

    const offerTotal = body.offerTotal ?? q.offerTotal;

    const { data: customer } = await A.from('users').select('full_name, email, phone').eq('id', booking.customer_user_id).single();
    const customerEmail = customer?.email as string | null;
    if (!customerEmail) return NextResponse.json({ error: 'customer_has_no_email' }, { status: 400 });

    const reference = `CARHIRE-${String(id).slice(0, 8)}-${Date.now()}`;
    let payLink: string;
    try {
      const init = await initTransaction({
        email: customerEmail,
        amountNaira: offerTotal,
        reference,
        callbackUrl: `${publicEnv.NEXT_PUBLIC_APP_URL ?? ''}/customer`,
        metadata: { type: 'car_hire_invoice', carHireBookingId: id },
      });
      payLink = init.authorizationUrl;
    } catch (err) {
      return NextResponse.json({ error: 'invoice_failed', message: err instanceof Error ? err.message : 'unknown' }, { status: 502 });
    }

    await A.from('car_hire_bookings')
      .update({
        status: 'quoted',
        assigned_driver_id: body.assignedDriverId ?? booking.assigned_driver_id ?? null,
        partner_id: vehicle.partner_id,
        vehicle_subtotal: q.vehicleSubtotal,
        driver_subtotal: q.driverSubtotal,
        partner_cost_total: q.partnerCostTotal,
        driver_pay_total: q.driverPayTotal,
        vat_amount: q.vatAmount,
        offer_total: offerTotal,
        margin_total: q.marginTotal,
        offer_conditions: body.offerConditions ?? null,
        admin_notes: body.adminNotes ?? booking.admin_notes ?? null,
        quoted_by: user.id,
        quoted_at: now,
        payment_reference: reference,
        payment_link: payLink,
        payment_status: 'unpaid',
        invoice_sent_at: now,
        updated_at: now,
      })
      .eq('id', id);

    // Notify the customer that their quote is ready to pay (best-effort).
    try {
      await sendPushToUser(admin, booking.customer_user_id, {
        title: 'Your car hire quote is ready',
        body: `${formatNaira(offerTotal)} for ${days} day${days === 1 ? '' : 's'} — tap to pay and confirm.`,
        url: '/customer/car-hire/bookings',
      });
    } catch { /* best-effort */ }
    try {
      const firstName = (customer?.full_name ?? 'there').split(' ')[0];
      await sendEmail({
        to: customerEmail,
        subject: 'Your Avanti car hire quote',
        html: `<p>Hi ${firstName},</p><p>Your car and driver are ready to confirm. The total is <strong>${formatNaira(offerTotal)}</strong> for ${days} day${days === 1 ? '' : 's'}.</p><p><a href="${payLink}">Pay now to confirm your booking</a></p>${body.offerConditions ? `<p>${body.offerConditions}</p>` : ''}<p>— Avanti</p>`,
      });
    } catch { /* best-effort */ }

    // Line up the assigned driver.
    await notifyAssignedDriver(A, body.assignedDriverId ?? booking.assigned_driver_id, {
      title: 'You\'ve been lined up for a car hire',
      body: 'You\'re the assigned driver on a car hire pending customer payment.',
    });

    return NextResponse.json({ ok: true, paymentLink: payLink, offerTotal });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.code }, { status: err.status });
    console.error('[car-hire bookings PATCH]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
