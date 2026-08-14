import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthUser, AuthError } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { cancelEngagement } from '@/lib/engagement/cancel-engagement';
import { sendPushToUser } from '@/lib/push/send';

function canManage(roles: string[]): boolean {
  return roles.includes('admin_support') || roles.includes('admin_finance') || roles.includes('super_admin');
}

const bodySchema = z.object({
  action: z.literal('cancel'),
  reason: z.string().trim().min(3).max(1000),
  fullRefund: z.boolean().optional(),
});

const NON_CANCELLABLE = ['completed', 'cancelled', 'refunded', 'expired', 'declined'];

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuthUser();
    if (!canManage(user.roles)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    const { id } = await ctx.params;

    let body: z.infer<typeof bodySchema>;
    try {
      body = bodySchema.parse(await req.json());
    } catch (err) {
      return NextResponse.json({ error: 'invalid_body', details: String(err) }, { status: 400 });
    }

    const admin = createServiceRoleClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const A = admin as any;
    const { data: eng } = await A.from('engagements')
      .select('id, status, customer_user_id, driver_id, starts_at, customer_price_total')
      .eq('id', id)
      .single();
    if (!eng) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    if (NON_CANCELLABLE.includes(eng.status)) {
      return NextResponse.json({ error: 'not_cancellable', message: `Cannot cancel a ${eng.status} engagement.` }, { status: 409 });
    }

    const result = await cancelEngagement(admin, eng, { actorUserId: user.id, reason: body.reason, forceFullRefund: body.fullRefund });

    // Notify customer + driver.
    try {
      await sendPushToUser(admin, eng.customer_user_id, { title: 'Engagement cancelled', body: result.refund > 0 ? `Your engagement was cancelled; a refund of ₦${Math.round(result.refund).toLocaleString('en-NG')} is on the way.` : 'Your engagement was cancelled.', url: `/customer/engagements/${id}` });
    } catch { /* best-effort */ }
    if (eng.driver_id) {
      try {
        const { data: dp } = await A.from('driver_profiles').select('user_id').eq('id', eng.driver_id).single();
        if (dp?.user_id) await sendPushToUser(admin, dp.user_id, { title: 'Engagement cancelled', body: 'An engagement was cancelled by Avanti.', url: '/driver/engagements' });
      } catch { /* best-effort */ }
    }

    try {
      await A.from('audit_logs').insert({ actor_user_id: user.id, actor_role: user.activeRole, entity_type: 'engagements', entity_id: id, action: 'cancel', metadata: { reason: body.reason, fee: result.fee, refund: result.refund, full_refund: !!body.fullRefund } });
    } catch { /* best-effort */ }

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.code }, { status: err.status });
    console.error('[admin engagement cancel]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
