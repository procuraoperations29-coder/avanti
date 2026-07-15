import { NextResponse } from 'next/server';
import { requireAuthUser, AuthError } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * GET /api/admin/finance/batches/[batchId]
 * Returns the batch plus its items (with driver + engagement info attached).
 */

function isFinanceAdmin(roles: string[]): boolean {
  return roles.includes('admin_finance') || roles.includes('super_admin');
}

export async function GET(
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

    const { data: batch, error: batchErr } = await admin
      .from('payout_batches')
      .select('*')
      .eq('id', batchId)
      .single();

    if (batchErr || !batch) {
      return NextResponse.json({ error: 'batch_not_found' }, { status: 404 });
    }

    const { data: items } = await admin
      .from('payout_items')
      .select('*')
      .eq('batch_id', batchId)
      .order('created_at', { ascending: true });

    const allItems = items ?? [];

    // Look up driver names + engagement info
    const driverProfileIds = Array.from(new Set(allItems.map((i) => i.driver_id)));
    const engagementIds = Array.from(new Set(allItems.map((i) => i.engagement_id)));

    let driverNames: Record<string, string> = {};
    if (driverProfileIds.length > 0) {
      const { data: profiles } = await admin
        .from('driver_profiles')
        .select('id, user_id')
        .in('id', driverProfileIds);
      const userIds = (profiles ?? []).map((p) => p.user_id).filter(Boolean) as string[];
      const { data: usersData } = userIds.length > 0
        ? await admin.from('users').select('id, full_name').in('id', userIds)
        : { data: [] };
      const nameByUserId = Object.fromEntries(
        (usersData ?? []).map((u) => [u.id, u.full_name ?? 'Driver'])
      );
      driverNames = Object.fromEntries(
        (profiles ?? []).map((p) => [p.id, nameByUserId[p.user_id ?? ''] ?? 'Driver'])
      );
    }

    let engagementDates: Record<string, string | null> = {};
    if (engagementIds.length > 0) {
      const { data: engagements } = await admin
        .from('engagements')
        .select('id, completed_at, engagement_type')
        .in('id', engagementIds);
      engagementDates = Object.fromEntries(
        (engagements ?? []).map((e) => [e.id, e.completed_at])
      );
    }

    const enrichedItems = allItems.map((i) => ({
      ...i,
      driver_name: driverNames[i.driver_id] ?? 'Driver',
      engagement_completed_at: engagementDates[i.engagement_id] ?? null,
    }));

    return NextResponse.json({ batch, items: enrichedItems });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.code }, { status: err.status });
    }
    console.error('[batches/[id] GET]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
