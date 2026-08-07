import { NextResponse } from 'next/server';
import { requireAuthUser, AuthError } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { sendPushToUser } from '@/lib/push/send';

function isFinanceAdmin(roles: string[]): boolean {
  return roles.includes('admin_finance') || roles.includes('super_admin');
}

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ batchId: string }> }
) {
  try {
    const user = await requireAuthUser();
    if (!isFinanceAdmin(user.roles)) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const { batchId } = await ctx.params;
    const admin = createServiceRoleClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (admin as any).rpc('fn_release_payout_batch', {
      p_batch_id: batchId,
      p_actor_user_id: user.id,
    });

    if (error) {
      return NextResponse.json(
        { error: 'release_failed', message: error.message },
        { status: 500 }
      );
    }

    // Push each paid driver "payment sent" (best-effort; no-op if push unset).
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const A = admin as any;
      const { data: payouts } = await A.from('payouts').select('driver_id, net_amount').eq('batch_id', batchId);
      const list: { driver_id: string | null; net_amount: number | null }[] = payouts ?? [];
      const totalByDriver: Record<string, number> = {};
      for (const p of list) if (p.driver_id) totalByDriver[p.driver_id] = (totalByDriver[p.driver_id] ?? 0) + Number(p.net_amount ?? 0);
      const driverIds = Object.keys(totalByDriver);
      if (driverIds.length) {
        const { data: dps } = await A.from('driver_profiles').select('id, user_id').in('id', driverIds);
        for (const d of (dps ?? []) as { id: string; user_id: string | null }[]) {
          const amt = totalByDriver[d.id] ?? 0;
          if (d.user_id && amt > 0) {
            await sendPushToUser(A, d.user_id, {
              title: 'Payment sent',
              body: `₦${Math.round(amt).toLocaleString('en-NG')} has been paid to your account.`,
              url: '/driver/earnings',
            });
          }
        }
      }
    } catch (e) {
      console.error('[batches/release] push failed', e);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.code }, { status: err.status });
    }
    console.error('[batches/release]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
