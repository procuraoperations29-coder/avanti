import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthUser, AuthError } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * PATCH /api/admin/users/[id] — user management controls.
 *
 * Actions:
 *   grant_role   { role }   — add a role (super_admin)
 *   revoke_role  { role }   — revoke a role (super_admin)
 *   suspend      { reason } — status=suspended + force sign-out (support/super)
 *   unsuspend               — status=active (support/super)
 *   soft_delete             — mark deleted, revoke roles + sessions (super_admin)
 *
 * Corporate roles are org-scoped and can't be granted here — do that from the
 * organisation's admin flow. Delete is a *soft* delete (recoverable), never a
 * hard auth deletion, so referenced history stays intact.
 */
const GRANTABLE = [
  'individual_customer', 'driver',
  'admin_verifier', 'admin_support', 'admin_finance', 'admin_compliance', 'super_admin',
] as const;

const bodySchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('grant_role'), role: z.enum(GRANTABLE) }),
  z.object({ action: z.literal('revoke_role'), role: z.enum(GRANTABLE) }),
  z.object({ action: z.literal('suspend'), reason: z.string().max(500).optional() }),
  z.object({ action: z.literal('unsuspend') }),
  z.object({ action: z.literal('soft_delete') }),
]);

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuthUser();
    const isSuper = user.roles.includes('super_admin');
    const canSupport = user.roles.includes('admin_support') || isSuper;
    const { id } = await ctx.params;

    let body: z.infer<typeof bodySchema>;
    try {
      body = bodySchema.parse(await req.json());
    } catch (err) {
      return NextResponse.json({ error: 'invalid_body', details: String(err) }, { status: 400 });
    }

    // Authorisation per action.
    const needsSuper = body.action === 'grant_role' || body.action === 'revoke_role' || body.action === 'soft_delete';
    if (needsSuper && !isSuper) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    if (!needsSuper && !canSupport) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

    // Guard against locking yourself out.
    if (id === user.id && (body.action === 'suspend' || body.action === 'soft_delete')) {
      return NextResponse.json({ error: 'self_action', message: 'You cannot suspend or delete your own account.' }, { status: 400 });
    }

    const admin = createServiceRoleClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const A = admin as any;
    const now = new Date().toISOString();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: target } = await A.from('users').select('id, status').eq('id', id).single();
    if (!target) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    let auditAction = 'update';

    if (body.action === 'grant_role') {
      const { data: existing } = await A.from('user_roles')
        .select('id').eq('user_id', id).eq('role', body.role).is('revoked_at', null).maybeSingle();
      if (!existing) {
        const { error } = await A.from('user_roles').insert({ user_id: id, role: body.role, granted_by: user.id, granted_at: now });
        if (error) return NextResponse.json({ error: 'grant_failed', message: error.message }, { status: 500 });
      }
      auditAction = 'create';
    } else if (body.action === 'revoke_role') {
      const { error } = await A.from('user_roles')
        .update({ revoked_at: now, updated_at: now }).eq('user_id', id).eq('role', body.role).is('revoked_at', null);
      if (error) return NextResponse.json({ error: 'revoke_failed', message: error.message }, { status: 500 });
      auditAction = 'update';
    } else if (body.action === 'suspend') {
      const { error } = await A.from('users').update({ status: 'suspended', sessions_revoked_at: now, updated_at: now }).eq('id', id);
      if (error) return NextResponse.json({ error: 'suspend_failed', message: error.message }, { status: 500 });
      auditAction = 'update';
    } else if (body.action === 'unsuspend') {
      const { error } = await A.from('users').update({ status: 'active', updated_at: now }).eq('id', id);
      if (error) return NextResponse.json({ error: 'unsuspend_failed', message: error.message }, { status: 500 });
      auditAction = 'update';
    } else if (body.action === 'soft_delete') {
      const { error } = await A.from('users').update({ deleted_at: now, status: 'deleted', sessions_revoked_at: now, updated_at: now }).eq('id', id);
      if (error) return NextResponse.json({ error: 'delete_failed', message: error.message }, { status: 500 });
      await A.from('user_roles').update({ revoked_at: now, updated_at: now }).eq('user_id', id).is('revoked_at', null);
      auditAction = 'soft_delete';
    }

    // Best-effort audit trail (never block the action on this).
    try {
      await A.from('audit_logs').insert({
        actor_user_id: user.id,
        actor_role: user.activeRole,
        entity_type: 'user',
        entity_id: id,
        action: auditAction,
        metadata: { control: body.action, ...('role' in body ? { role: body.role } : {}), ...('reason' in body && body.reason ? { reason: body.reason } : {}) },
      });
    } catch { /* audit is best-effort */ }

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.code }, { status: err.status });
    console.error('[admin users PATCH]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
