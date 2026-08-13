import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthUser, AuthError } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';

function canManage(roles: string[]): boolean {
  return roles.includes('admin_finance') || roles.includes('super_admin');
}

const bodySchema = z.object({
  rateCardId: z.string().uuid(),
  engagementType: z.enum(['hourly', 'full_day']),
  minVerificationTier: z.enum(['t1', 't2', 't3', 't4']),
  vehicleClass: z.enum(['sedan', 'suv', 'executive', 'van', 'pickup']),
  unit: z.enum(['hour', 'day']),
  baseCustomerPrice: z.number().min(0).max(100_000_000),
  baseDriverPayout: z.number().min(0).max(100_000_000),
  overtimeMultiplier: z.number().min(1).max(5).nullable().optional(),
  overtimeThresholdHours: z.number().min(0).max(24).nullable().optional(),
  minimumCharge: z.number().min(0).max(100_000_000).nullable().optional(),
});

/** POST /api/admin/pricing/rules — add a new on-demand price rule to a card. */
export async function POST(req: Request) {
  try {
    const user = await requireAuthUser();
    if (!canManage(user.roles)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

    let body: z.infer<typeof bodySchema>;
    try {
      body = bodySchema.parse(await req.json());
    } catch (err) {
      return NextResponse.json({ error: 'invalid_body', details: String(err) }, { status: 400 });
    }
    if (body.baseDriverPayout > body.baseCustomerPrice) {
      return NextResponse.json({ error: 'payout_exceeds_price' }, { status: 400 });
    }

    const admin = createServiceRoleClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (admin as any)
      .from('price_rules')
      .insert({
        rate_card_id: body.rateCardId,
        engagement_type: body.engagementType,
        min_verification_tier: body.minVerificationTier,
        vehicle_class: body.vehicleClass,
        time_band: 'day',
        day_type: 'weekday',
        unit: body.unit,
        base_customer_price: body.baseCustomerPrice,
        base_driver_payout: body.baseDriverPayout,
        overtime_multiplier: body.overtimeMultiplier ?? null,
        overtime_threshold_hours: body.overtimeThresholdHours ?? null,
        minimum_charge: body.minimumCharge ?? null,
      })
      .select('id')
      .single();
    if (error) {
      const dup = error.message?.toLowerCase().includes('duplicate') || error.code === '23505';
      return NextResponse.json({ error: dup ? 'duplicate_rule' : 'create_failed', message: dup ? 'A rule for this tier + class + type already exists on this card.' : error.message }, { status: dup ? 409 : 500 });
    }

    return NextResponse.json({ ok: true, id: data.id });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.code }, { status: err.status });
    console.error('[pricing rules POST]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
