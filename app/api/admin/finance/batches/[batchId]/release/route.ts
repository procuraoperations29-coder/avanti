import { NextResponse } from 'next/server';
import { requireAuthUser, AuthError } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';

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

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.code }, { status: err.status });
    }
    console.error('[batches/release]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
