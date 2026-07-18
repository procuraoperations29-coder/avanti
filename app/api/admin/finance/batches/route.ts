import { NextResponse } from 'next/server';
import { requireAuthUser, AuthError } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';

function isFinanceAdmin(roles: string[]): boolean {
  return roles.includes('admin_finance') || roles.includes('super_admin');
}

export async function GET() {
  try {
    const user = await requireAuthUser();
    if (!isFinanceAdmin(user.roles)) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const admin = createServiceRoleClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (admin as any)
      .from('payout_batches')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      return NextResponse.json({ error: 'list_failed', message: error.message }, { status: 500 });
    }

    return NextResponse.json({ batches: data ?? [] });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.code }, { status: err.status });
    }
    console.error('[batches GET]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

interface BuildBatchResult {
  batch_id: string;
  payout_count: number;
  total_gross: number;
  total_net: number;
  skipped_count: number;
  skipped_reason: string | null;
}

export async function POST() {
  try {
    const user = await requireAuthUser();
    if (!isFinanceAdmin(user.roles)) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const admin = createServiceRoleClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (admin as any).rpc('fn_build_payout_batch', {
      p_actor_user_id: user.id,
    });

    if (error) {
      return NextResponse.json({ error: 'create_failed', message: error.message }, { status: 500 });
    }

    // fn_build_payout_batch now returns jsonb (was uuid). Depending on the
    // supabase-js version this may come back already parsed or as a string.
    const result: BuildBatchResult = typeof data === 'string' ? JSON.parse(data) : data;

    return NextResponse.json({
      batchId: result.batch_id,
      payoutCount: result.payout_count,
      totalGross: result.total_gross,
      skippedCount: result.skipped_count,
      skippedReason: result.skipped_reason,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.code }, { status: err.status });
    }
    console.error('[batches POST]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
