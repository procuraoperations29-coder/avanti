import { NextResponse } from 'next/server';
import { requireAuthUser, AuthError } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { countersignAsAvanti } from '@/lib/contracts/countersign';

function canManage(roles: string[]): boolean {
  return roles.includes('admin_support') || roles.includes('admin_finance') ||
    roles.includes('admin_compliance') || roles.includes('super_admin');
}

/** Manually record Avanti's countersignature on a contract (backfill / edge cases). */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuthUser();
    if (!canManage(user.roles)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    const { id } = await ctx.params;

    const admin = createServiceRoleClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const A = admin as any;
    const { data: c } = await A.from('contracts').select('id').eq('id', id).single();
    if (!c) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    await countersignAsAvanti(A, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.code }, { status: err.status });
    console.error('[contract countersign]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
