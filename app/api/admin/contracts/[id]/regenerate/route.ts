import { NextResponse } from 'next/server';
import { requireAuthUser, AuthError } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { regenerateDriverContract } from '@/lib/contracts/driver-contract';

function canManage(roles: string[]): boolean {
  return roles.includes('admin_support') || roles.includes('admin_finance') ||
    roles.includes('admin_compliance') || roles.includes('super_admin');
}

/**
 * POST /api/admin/contracts/[id]/regenerate — rebuild a driver services
 * contract's terms from current onboarding data (e.g. to pick up a corrected
 * legal name). Signatures are preserved; only applies to driver contracts.
 */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuthUser();
    if (!canManage(user.roles)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    const { id } = await ctx.params;

    const admin = createServiceRoleClient();
    const ok = await regenerateDriverContract(admin, id);
    if (!ok) return NextResponse.json({ error: 'not_regenerable', message: 'Only driver services contracts can be regenerated.' }, { status: 409 });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.code }, { status: err.status });
    console.error('[contract regenerate]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
