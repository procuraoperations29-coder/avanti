import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthUser, AuthError } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { CANCELLABLE_STATUSES } from '@/lib/engagement/cancellation';
import { cancelEngagement } from '@/lib/engagement/cancel-engagement';
import { sendPushToUser } from '@/lib/push/send';

const bodySchema = z.object({ reason: z.string().trim().min(3).max(1000) });

/**
 * Customer cancels their own on-demand engagement (a reason is compulsory).
 * Applies the notice-based cancellation fee and auto-refunds the balance.
 */
export async function POST(req: Request, ctx: { params: Promise<{ engagementId: string }> }) {
  try {
    const user = await requireAuthUser();
    const { engagementId } = await ctx.params;

    let body: z.infer<typeof bodySchema>;
    try {
      body = bodySchema.parse(await req.json());
    } catch {
      return NextResponse.json({ error: 'reason_required', message: 'Please give a reason for cancelling.' }, { status: 400 });
    }

    const admin = createServiceRoleClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const A = admin as any;
    const { data: eng } = await A.from('engagements')
      .select('id, status, customer_user_id, driver_id, starts_at, customer_price_total')
      .eq('id', engagementId)
      .single();

    if (!eng || eng.customer_user_id !== user.id) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    if (!CANCELLABLE_STATUSES.includes(eng.status)) {
      return NextResponse.json({ error: 'not_cancellable', message: 'This engagement can no longer be cancelled.' }, { status: 409 });
    }

    const result = await cancelEngagement(admin, eng, { actorUserId: user.id, reason: body.reason });

    // Notify the assigned driver, if any.
    if (eng.driver_id) {
      try {
        const { data: dp } = await A.from('driver_profiles').select('user_id').eq('id', eng.driver_id).single();
        if (dp?.user_id) await sendPushToUser(admin, dp.user_id, { title: 'Engagement cancelled', body: 'A customer cancelled an upcoming engagement.', url: '/driver/engagements' });
      } catch { /* best-effort */ }
    }

    return NextResponse.json({ ok: true, fee: result.fee, refund: result.refund, refundProcessed: result.refundProcessed });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.code }, { status: err.status });
    console.error('[customer cancel]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
