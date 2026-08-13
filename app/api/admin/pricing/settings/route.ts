import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthUser, AuthError } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';

function canManage(roles: string[]): boolean {
  return roles.includes('admin_finance') || roles.includes('super_admin');
}

const rate = z.number().min(0).max(1);
const tierMap = z.record(z.enum(['t1', 't2', 't3', 't4']), z.number().min(0));

const bodySchema = z.object({
  vatRate: rate.optional(),
  ondemandCommissionByTier: tierMap.optional(),
  tierMonthlySalary: tierMap.optional(),
  placementCommissionRate: rate.optional(),
  placementFeeRate: rate.optional(),
  placementUpfrontRate: rate.optional(),
  corporateUpfrontRate: rate.optional(),
});

export async function PATCH(req: Request) {
  try {
    const user = await requireAuthUser();
    if (!canManage(user.roles)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

    let body: z.infer<typeof bodySchema>;
    try {
      body = bodySchema.parse(await req.json());
    } catch (err) {
      return NextResponse.json({ error: 'invalid_body', details: String(err) }, { status: 400 });
    }

    const update: Record<string, unknown> = { updated_at: new Date().toISOString(), updated_by: user.id };
    if (body.vatRate != null) update.vat_rate = body.vatRate;
    if (body.ondemandCommissionByTier) update.ondemand_commission_by_tier = body.ondemandCommissionByTier;
    if (body.tierMonthlySalary) update.tier_monthly_salary = body.tierMonthlySalary;
    if (body.placementCommissionRate != null) update.placement_commission_rate = body.placementCommissionRate;
    if (body.placementFeeRate != null) update.placement_fee_rate = body.placementFeeRate;
    if (body.placementUpfrontRate != null) update.placement_upfront_rate = body.placementUpfrontRate;
    if (body.corporateUpfrontRate != null) update.corporate_upfront_rate = body.corporateUpfrontRate;

    const admin = createServiceRoleClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (admin as any).from('pricing_settings').update(update).eq('id', 1);
    if (error) return NextResponse.json({ error: 'update_failed', message: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.code }, { status: err.status });
    console.error('[pricing settings PATCH]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
