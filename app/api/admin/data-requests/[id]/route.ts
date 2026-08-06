import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthUser, AuthError } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * PATCH /api/admin/data-requests/[id] — NDPR/GDPR request handling.
 *   start                 — mark in progress
 *   complete { note? }    — mark completed; erasure requests also soft-delete the subject
 *   reject   { note? }    — mark rejected
 * Compliance / super only.
 */
const bodySchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('start') }),
  z.object({ action: z.literal('complete'), note: z.string().max(2000).optional() }),
  z.object({ action: z.literal('reject'), note: z.string().max(2000).optional() }),
]);

function canAct(roles: string[]): boolean {
  return roles.includes('admin_compliance') || roles.includes('super_admin');
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
    const { data: dsr } = await A.from('data_subject_requests').select('id, requester_user_id, request_type, status').eq('id', id).single();
    if (!dsr) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    let erased = false;
    if (body.action === 'start') {
      await A.from('data_subject_requests').update({ status: 'in_progress', updated_at: now }).eq('id', id);
    } else if (body.action === 'reject') {
      await A.from('data_subject_requests').update({ status: 'rejected', notes: body.note ?? dsr.notes ?? null, updated_at: now }).eq('id', id);
    } else if (body.action === 'complete') {
      await A.from('data_subject_requests').update({ status: 'completed', completed_at: now, notes: body.note ?? dsr.notes ?? null, updated_at: now }).eq('id', id);
      // Right-to-erasure: soft-delete the subject and revoke access.
      if (String(dsr.request_type).toLowerCase().includes('eras') || String(dsr.request_type).toLowerCase().includes('delet')) {
        await A.from('users').update({ deleted_at: now, status: 'deleted', sessions_revoked_at: now, updated_at: now }).eq('id', dsr.requester_user_id);
        await A.from('user_roles').update({ revoked_at: now, updated_at: now }).eq('user_id', dsr.requester_user_id).is('revoked_at', null);
        erased = true;
      }
    }

    try {
      await A.from('audit_logs').insert({ actor_user_id: user.id, actor_role: user.activeRole, entity_type: 'data_subject_request', entity_id: id, action: body.action === 'complete' ? (erased ? 'soft_delete' : 'update') : 'update', metadata: { control: body.action, request_type: dsr.request_type, erased } });
    } catch { /* best-effort */ }

    return NextResponse.json({ ok: true, erased });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.code }, { status: err.status });
    console.error('[admin data-requests PATCH]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
