import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthUser, AuthError } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { canManageCarHire } from '../partners/route';

const VEHICLE_CLASSES = ['sedan', 'suv', 'executive', 'van', 'pickup'] as const;

export const vehicleSchema = z.object({
  partner_id: z.string().uuid(),
  make: z.string().min(1).max(80),
  model: z.string().min(1).max(80),
  year: z.number().int().min(1990).max(2100).nullable().optional(),
  colour: z.string().max(40).nullable().optional(),
  plate_number: z.string().max(20).nullable().optional(),
  vehicle_class: z.enum(VEHICLE_CLASSES),
  transmission: z.enum(['automatic', 'manual']).nullable().optional(),
  seats: z.number().int().min(1).max(80).nullable().optional(),
  features: z.array(z.string().max(40)).max(30).optional(),
  city: z.string().max(120).nullable().optional(),
  photo_path: z.string().max(400).nullable().optional(),
  partner_daily_cost: z.number().min(0).max(100_000_000),
  daily_rate: z.number().min(0).max(100_000_000),
  included_hours_per_day: z.number().min(1).max(24),
  overtime_hourly_rate: z.number().min(0).max(10_000_000).nullable().optional(),
  min_days: z.number().int().min(1).max(365),
  driver_daily_rate: z.number().min(0).max(10_000_000),
  driver_daily_pay: z.number().min(0).max(10_000_000),
  status: z.enum(['available', 'unavailable', 'maintenance', 'retired']).optional(),
})
  .refine((v) => v.daily_rate >= v.partner_daily_cost, { message: 'daily_rate must be ≥ partner_daily_cost', path: ['daily_rate'] })
  .refine((v) => v.driver_daily_rate >= v.driver_daily_pay, { message: 'driver_daily_rate must be ≥ driver_daily_pay', path: ['driver_daily_rate'] });

export async function POST(req: Request) {
  try {
    const user = await requireAuthUser();
    if (!canManageCarHire(user.roles)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

    let body: z.infer<typeof vehicleSchema>;
    try {
      body = vehicleSchema.parse(await req.json());
    } catch (err) {
      return NextResponse.json({ error: 'invalid_body', details: String(err) }, { status: 400 });
    }

    const admin = createServiceRoleClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (admin as any)
      .from('hire_vehicles')
      .insert({ ...body, features: body.features ?? [] })
      .select('id')
      .single();
    if (error) return NextResponse.json({ error: 'create_failed', message: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, id: data.id });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.code }, { status: err.status });
    console.error('[car-hire vehicles POST]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
