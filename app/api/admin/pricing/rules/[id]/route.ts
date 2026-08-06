import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthUser, AuthError } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * PATCH /api/admin/pricing/rules/[id] — edit a price rule's amounts.
 * Finance / super only. Enforces driver payout <= customer price.
 */
const bodySchema = z.object({
  baseCustomerPrice: z.number().min(0).max(100_000_000),
  baseDriverPayout: z.number().min(0).max(100_000_000),
  overtimeMultiplier: z.number().min(1).max(10).nullable().optional(),
  overtimeThresholdHours: z.number().min(0).max(24).nullable().optional(),
  minimumCharge: z.number().min(0).max(100_000_000).nullable().optional(),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuthUser();
    if (!user.roles.includes('admin_finance') && !user.roles.includes('super_admin')) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    const { id } = await ctx.params;
    let body: z.infer<typeof bodySchema>;
    try {
      body = bodySchema.parse(await req.json());
    } catch (err) {
      return NextResponse.json({ error: 'invalid_body', details: String(err) }, { status: 400 });
    }
    if (body.baseDriverPayout > body.baseCustomerPrice) {
      return NextResponse.json({ error: 'payout_exceeds_price', message: 'Driver payout cannot exceed the customer price.' }, { status: 400 });
    }

    const admin = createServiceRoleClient();
    const now = new Date().toISOString();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (admin as any).from('price_rules').update({
      base_customer_price: body.baseCustomerPrice,
      base_driver_payout: body.baseDriverPayout,
      overtime_multiplier: body.overtimeMultiplier ?? null,
      overtime_threshold_hours: body.overtimeThresholdHours ?? null,
      minimum_charge: body.minimumCharge ?? null,
      updated_at: now,
    }).eq('id', id);
    if (error) return NextResponse.json({ error: 'update_failed', message: error.message }, { status: 500 });

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (admin as any).from('audit_logs').insert({
        actor_user_id: user.id, actor_role: user.activeRole, entity_type: 'price_rule', entity_id: id, action: 'update',
        metadata: { base_customer_price: body.baseCustomerPrice, base_driver_payout: body.baseDriverPayout },
      });
    } catch { /* best-effort */ }

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.code }, { status: err.status });
    console.error('[pricing rule PATCH]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
