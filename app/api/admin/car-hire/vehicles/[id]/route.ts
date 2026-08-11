import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthUser, AuthError } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { canManageCarHire } from '../../partners/route';

const VEHICLE_CLASSES = ['sedan', 'suv', 'executive', 'van', 'pickup'] as const;

const patchSchema = z.object({
  make: z.string().min(1).max(80).optional(),
  model: z.string().min(1).max(80).optional(),
  year: z.number().int().min(1990).max(2100).nullable().optional(),
  colour: z.string().max(40).nullable().optional(),
  plate_number: z.string().max(20).nullable().optional(),
  vehicle_class: z.enum(VEHICLE_CLASSES).optional(),
  transmission: z.enum(['automatic', 'manual']).nullable().optional(),
  seats: z.number().int().min(1).max(80).nullable().optional(),
  features: z.array(z.string().max(40)).max(30).optional(),
  city: z.string().max(120).nullable().optional(),
  photo_path: z.string().max(400).nullable().optional(),
  partner_daily_cost: z.number().min(0).max(100_000_000).optional(),
  daily_rate: z.number().min(0).max(100_000_000).optional(),
  included_hours_per_day: z.number().min(1).max(24).optional(),
  overtime_hourly_rate: z.number().min(0).max(10_000_000).nullable().optional(),
  min_days: z.number().int().min(1).max(365).optional(),
  driver_daily_rate: z.number().min(0).max(10_000_000).optional(),
  driver_daily_pay: z.number().min(0).max(10_000_000).optional(),
  status: z.enum(['available', 'unavailable', 'maintenance', 'retired']).optional(),
  is_active: z.boolean().optional(),
  deleted: z.literal(true).optional(),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuthUser();
    if (!canManageCarHire(user.roles)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    const { id } = await ctx.params;

    let body: z.infer<typeof patchSchema>;
    try {
      body = patchSchema.parse(await req.json());
    } catch (err) {
      return NextResponse.json({ error: 'invalid_body', details: String(err) }, { status: 400 });
    }

    const admin = createServiceRoleClient();
    const now = new Date().toISOString();
    const { deleted, ...fields } = body;
    const update: Record<string, unknown> = { ...fields, updated_at: now };
    if (deleted) update.deleted_at = now;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (admin as any).from('hire_vehicles').update(update).eq('id', id);
    if (error) return NextResponse.json({ error: 'update_failed', message: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.code }, { status: err.status });
    console.error('[car-hire vehicles PATCH]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
