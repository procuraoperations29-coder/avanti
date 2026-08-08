import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthUser, AuthError } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * PATCH /api/admin/drivers/[id] — driver-level controls (id is a
 * driver_profiles.id). Suspend/unsuspend keeps a driver on the platform but
 * off the bookable pool. Verifier / support / super only.
 */
const bodySchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('suspend'), reason: z.string().max(500).optional() }),
  z.object({ action: z.literal('unsuspend') }),
]);

function canAct(roles: string[]): boolean {
  return roles.includes('admin_verifier') || roles.includes('admin_support') || roles.includes('super_admin');
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuthUser();
    if (!canAct(user.roles)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
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
    const now = new Date().toISOString();

    const update = body.action === 'suspend'
      ? { suspended: true, suspended_reason: body.reason ?? null, updated_at: now }
      : { suspended: false, suspended_reason: null, suspended_until: null, updated_at: now };

    const { error } = await A.from('driver_profiles').update(update).eq('id', id);
    if (error) return NextResponse.json({ error: 'update_failed', message: error.message }, { status: 500 });

    try {
      await A.from('audit_logs').insert({
        actor_user_id: user.id, actor_role: user.activeRole, entity_type: 'driver_profiles', entity_id: id,
        action: 'update', metadata: { control: body.action, ...('reason' in body && body.reason ? { reason: body.reason } : {}) },
      });
    } catch { /* best-effort */ }

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.code }, { status: err.status });
    console.error('[admin drivers PATCH]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
