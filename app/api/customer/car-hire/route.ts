import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthUser, AuthError } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { computeCarHireQuote, daysBetween } from '@/lib/carhire/quote';
import { getPricingSettings } from '@/lib/pricing/settings';

const bodySchema = z.object({
  vehicleId: z.string().uuid(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  hoursPerDay: z.number().min(1).max(24),
  pickupAddress: z.string().min(2).max(400),
  passengers: z.number().int().min(1).max(80).nullable().optional(),
  contactPhone: z.string().min(5).max(40),
  specialRequirements: z.string().max(2000).nullable().optional(),
});

/**
 * POST /api/customer/car-hire — a customer requests a specific hire vehicle.
 * We snapshot an indicative price (recomputed server-side); ops then confirms
 * availability, assigns a driver, and sends the final quote to pay.
 */
export async function POST(req: Request) {
  try {
    const user = await requireAuthUser();

    let body: z.infer<typeof bodySchema>;
    try {
      body = bodySchema.parse(await req.json());
    } catch (err) {
      return NextResponse.json({ error: 'invalid_body', details: String(err) }, { status: 400 });
    }
    if (body.endDate < body.startDate) {
      return NextResponse.json({ error: 'invalid_dates' }, { status: 400 });
    }

    const admin = createServiceRoleClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const A = admin as any;

    const { data: v } = await A.from('hire_vehicles')
      .select('id, partner_id, daily_rate, driver_daily_rate, partner_daily_cost, driver_daily_pay, included_hours_per_day, overtime_hourly_rate, min_days, status, is_active, deleted_at, city')
      .eq('id', body.vehicleId)
      .single();
    if (!v || v.status !== 'available' || !v.is_active || v.deleted_at) {
      return NextResponse.json({ error: 'vehicle_unavailable' }, { status: 409 });
    }

    const days = daysBetween(body.startDate, body.endDate);
    const vatRate = (await getPricingSettings()).vatRate;
    const quote = computeCarHireQuote(
      {
        daily_rate: Number(v.daily_rate),
        partner_daily_cost: Number(v.partner_daily_cost),
        driver_daily_rate: Number(v.driver_daily_rate),
        driver_daily_pay: Number(v.driver_daily_pay),
        included_hours_per_day: Number(v.included_hours_per_day),
        overtime_hourly_rate: v.overtime_hourly_rate != null ? Number(v.overtime_hourly_rate) : null,
        min_days: Number(v.min_days),
      },
      { days, hoursPerDay: body.hoursPerDay },
      vatRate
    );

    const { data: booking, error } = await A.from('car_hire_bookings')
      .insert({
        customer_user_id: user.id,
        vehicle_id: v.id,
        partner_id: v.partner_id,
        start_date: body.startDate,
        end_date: body.endDate,
        days: quote.days,
        hours_per_day: body.hoursPerDay,
        pickup_address: { line: body.pickupAddress },
        city: v.city ?? null,
        passengers: body.passengers ?? null,
        contact_phone: body.contactPhone,
        special_requirements: body.specialRequirements ?? null,
        indicative_total: quote.offerTotal,
        currency: 'NGN',
        status: 'new',
      })
      .select('id')
      .single();
    if (error) return NextResponse.json({ error: 'create_failed', message: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, bookingId: booking.id, indicativeTotal: quote.offerTotal });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.code }, { status: err.status });
    console.error('[customer car-hire POST]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
