import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthUser, AuthError } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * PATCH /api/admin/disputes/[id] — dispute resolution workflow.
 *   set_status     { status, note? }
 *   add_message    { body }
 *   record_outcome { kind, amount?, notes?, targetUserId? }
 * Compliance / support / super only.
 */
const STATUSES = ['raised', 'triaged', 'awaiting_respondent', 'under_review', 'mediation', 'escalated', 'resolved_by_agreement', 'resolved_by_decision', 'withdrawn'] as const;
const OUTCOMES = ['full_refund', 'partial_refund', 'credit_apology', 're_invoice', 'no_action', 'driver_warning', 'driver_suspension', 'driver_ban', 'customer_warning', 'customer_suspension', 'customer_ban', 'insurance_claim_opened', 'legal_escalation'] as const;
const RESOLVED = ['resolved_by_agreement', 'resolved_by_decision', 'withdrawn'];

const bodySchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('set_status'), status: z.enum(STATUSES), note: z.string().max(2000).optional() }),
  z.object({ action: z.literal('add_message'), body: z.string().min(1).max(4000) }),
  z.object({ action: z.literal('record_outcome'), kind: z.enum(OUTCOMES), amount: z.number().min(0).max(100_000_000).nullable().optional(), notes: z.string().max(2000).optional(), targetUserId: z.string().uuid().nullable().optional() }),
]);

function canView(roles: string[]): boolean {
  return roles.includes('admin_compliance') || roles.includes('admin_support') || roles.includes('super_admin');
}
function canResolve(roles: string[]): boolean {
  // Compliance adjudicates; support raises + adds context only.
  return roles.includes('admin_compliance') || roles.includes('super_admin');
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuthUser();
    if (!canView(user.roles)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    const { id } = await ctx.params;

    let body: z.infer<typeof bodySchema>;
    try {
      body = bodySchema.parse(await req.json());
    } catch (err) {
      return NextResponse.json({ error: 'invalid_body', details: String(err) }, { status: 400 });
    }

    // Status changes and outcomes are Compliance-only; notes are open to support too.
    if ((body.action === 'set_status' || body.action === 'record_outcome') && !canResolve(user.roles)) {
      return NextResponse.json({ error: 'forbidden', message: 'Only Compliance can change status or record an outcome.' }, { status: 403 });
    }

    const admin = createServiceRoleClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const A = admin as any;
    const now = new Date().toISOString();
    const { data: dispute } = await A.from('disputes').select('id, status').eq('id', id).single();
    if (!dispute) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    let auditAction = 'update';

    if (body.action === 'set_status') {
      const upd: Record<string, unknown> = { status: body.status, updated_at: now };
      if (body.status === 'triaged') { upd.triaged_at = now; upd.triaged_by = user.id; }
      if (RESOLVED.includes(body.status)) { upd.resolved_at = now; upd.resolved_by = user.id; if (body.note) upd.resolution_summary = body.note; }
      const { error } = await A.from('disputes').update(upd).eq('id', id);
      if (error) return NextResponse.json({ error: 'update_failed', message: error.message }, { status: 500 });
    } else if (body.action === 'add_message') {
      const { error } = await A.from('dispute_messages').insert({ dispute_id: id, sender_user_id: user.id, sender_role: 'avanti', body: body.body });
      if (error) return NextResponse.json({ error: 'message_failed', message: error.message }, { status: 500 });
      auditAction = 'create';
    } else if (body.action === 'record_outcome') {
      const { error } = await A.from('dispute_outcomes').insert({
        dispute_id: id, kind: body.kind, amount: body.amount ?? null, target_user_id: body.targetUserId ?? null, notes: body.notes ?? null,
      });
      if (error) return NextResponse.json({ error: 'outcome_failed', message: error.message }, { status: 500 });
      // Resolve the dispute on a recorded decision.
      await A.from('disputes').update({ status: 'resolved_by_decision', resolved_at: now, resolved_by: user.id, resolution_summary: body.notes ?? null, updated_at: now }).eq('id', id);
      // Enforce user-facing outcomes.
      if (body.targetUserId && ['driver_suspension', 'customer_suspension', 'driver_ban', 'customer_ban'].includes(body.kind)) {
        await A.from('users').update({ status: 'suspended', sessions_revoked_at: now, updated_at: now }).eq('id', body.targetUserId);
      }
      auditAction = body.kind.includes('ban') ? 'delete' : 'update';
    }

    try {
      await A.from('audit_logs').insert({ actor_user_id: user.id, actor_role: user.activeRole, entity_type: 'dispute', entity_id: id, action: auditAction, metadata: { control: body.action, ...('kind' in body ? { kind: body.kind } : {}), ...('status' in body ? { status: body.status } : {}) } });
    } catch { /* best-effort */ }

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.code }, { status: err.status });
    console.error('[admin disputes PATCH]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
