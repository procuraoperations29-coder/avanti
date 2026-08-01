import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthUser, AuthError } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';

const bodySchema = z.object({
  tripType: z.enum(['round_trip', 'one_way']),
  originCity: z.string().min(1).max(120),
  destinations: z.array(z.string().min(1).max(120)).min(1).max(10),
  departureAt: z.string().min(1),
  returnAt: z.string().nullable().optional(),
  days: z.number().int().positive().nullable().optional(),
  nights: z.number().int().min(0).max(365).optional().default(0),
  vehicleDescription: z.string().min(2).max(200),
  vehicleClass: z.enum(['sedan', 'suv', 'executive', 'van', 'pickup']),
  transmission: z.enum(['automatic', 'manual']),
  passengers: z.number().int().min(0).max(50),
  dailyUsage: z.string().max(1000).nullable().optional(),
  accommodation: z.enum(['customer_arranges', 'include_in_price']),
  tierPreference: z.enum(['standard', 'professional', 'executive']).nullable().optional(),
  specialRequirements: z.string().max(2000).nullable().optional(),
  purpose: z.string().max(200).nullable().optional(),
  pickupAddress: z.string().min(3).max(300),
  notes: z.string().max(2000).nullable().optional(),
  contactMethod: z.enum(['whatsapp', 'phone', 'email']),
  contactDetail: z.string().min(3).max(200),
});

export async function POST(req: Request) {
  try {
    const user = await requireAuthUser();

    let body: z.infer<typeof bodySchema>;
    try {
      body = bodySchema.parse(await req.json());
    } catch (err) {
      return NextResponse.json({ error: 'invalid_body', details: String(err) }, { status: 400 });
    }

    if (body.tripType === 'round_trip' && !body.returnAt) {
      return NextResponse.json({ error: 'return_required' }, { status: 400 });
    }

    const admin = createServiceRoleClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: request, error: insertErr } = await (admin as any)
      .from('trip_requests')
      .insert({
        customer_user_id: user.id,
        trip_type: body.tripType,
        origin_city: body.originCity,
        destinations: body.destinations,
        departure_at: body.departureAt,
        return_at: body.tripType === 'round_trip' ? body.returnAt : null,
        days: body.days ?? null,
        nights: body.nights ?? 0,
        vehicle_description: body.vehicleDescription,
        vehicle_class: body.vehicleClass,
        transmission: body.transmission,
        passengers: body.passengers,
        daily_usage: body.dailyUsage ?? null,
        accommodation: body.accommodation,
        tier_preference: body.tierPreference ?? null,
        special_requirements: body.specialRequirements ?? null,
        purpose: body.purpose ?? null,
        pickup_address: body.pickupAddress,
        notes: body.notes ?? null,
        contact_method: body.contactMethod,
        contact_detail: body.contactDetail,
        status: 'new',
      })
      .select('id')
      .single();

    if (insertErr || !request) {
      return NextResponse.json(
        { error: 'submit_failed', message: insertErr?.message ?? 'unknown' },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, requestId: request.id });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.code }, { status: err.status });
    }
    console.error('[trip-request]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
