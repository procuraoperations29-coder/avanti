import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthUser, AuthError } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * POST /api/admin/sanctions — record a screening result and schedule the next
 * re-check. Upserts one active row per subject. Compliance / verifier / super.
 */
const bodySchema = z.object({
  userId: z.string().uuid(),
  driverId: z.string().uuid().nullable().optional(),
  status: z.enum(['pending', 'clear', 'hit', 'needs_review']),
  monthsUntilNext: z.number().int().min(0).max(60).optional(),
  notes: z.string().max(2000).optional(),
});

function canAct(roles: string[]): boolean {
  return roles.includes('admin_compliance') || roles.includes('admin_verifier') || roles.includes('super_admin');
}

export async function POST(req: Request) {
  try {
    const user = await requireAuthUser();
    if (!canAct(user.roles)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

    let body: z.infer<typeof bodySchema>;
    try {
      body = bodySchema.parse(await req.json());
    } catch (err) {
      return NextResponse.json({ error: 'invalid_body', details: String(err) }, { status: 400 });
    }

    const admin = createServiceRoleClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const A = admin as any;
    const now = new Date();
    const nowIso = now.toISOString();
    const months = body.monthsUntilNext ?? (body.status === 'clear' ? 12 : 0);
    const nextDue = months > 0 ? new Date(now.getFullYear(), now.getMonth() + months, now.getDate()).toISOString() : null;

    const row = {
      user_id: body.userId,
      driver_id: body.driverId ?? null,
      status: body.status,
      checked_at: body.status === 'clear' || body.status === 'hit' ? nowIso : null,
      next_check_due: nextDue,
      notes: body.notes ?? null,
      created_by: user.id,
      updated_at: nowIso,
    };
    const { error } = await A.from('sanctions_checks').upsert(row, { onConflict: 'user_id' });
    if (error) return NextResponse.json({ error: 'save_failed', message: error.message }, { status: 500 });

    try {
      await A.from('audit_logs').insert({ actor_user_id: user.id, actor_role: user.activeRole, entity_type: 'sanctions_check', entity_id: body.userId, action: 'update', metadata: { status: body.status, next_check_due: nextDue } });
    } catch { /* best-effort */ }

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.code }, { status: err.status });
    console.error('[admin sanctions POST]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
