import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthUser, AuthError } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * POST /api/admin/disputes — raise (open) a dispute.
 *
 * Intake is a SUPPORT function — they field the complaint and log the case.
 * Compliance then adjudicates it via PATCH /api/admin/disputes/[id].
 */
const CATEGORIES = ['no_show', 'late_arrival', 'service_quality', 'overtime_disagreement', 'vehicle_damage', 'financial', 'contract_breach', 'safety_incident', 'misconduct', 'fraud'] as const;

const bodySchema = z.object({
  engagementId: z.string().uuid(),
  category: z.enum(CATEGORIES),
  severity: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  summary: z.string().min(1).max(2000),
  raisedBy: z.enum(['customer', 'driver']),
});

function canRaise(roles: string[]): boolean {
  return roles.includes('admin_support') || roles.includes('super_admin');
}

export async function POST(req: Request) {
  try {
    const user = await requireAuthUser();
    if (!canRaise(user.roles)) return NextResponse.json({ error: 'forbidden', message: 'Raising disputes is a Support function.' }, { status: 403 });

    let body: z.infer<typeof bodySchema>;
    try {
      body = bodySchema.parse(await req.json());
    } catch (err) {
      return NextResponse.json({ error: 'invalid_body', details: String(err) }, { status: 400 });
    }

    const admin = createServiceRoleClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const A = admin as any;

    const { data: eng } = await A.from('engagements').select('id, customer_user_id, driver_id').eq('id', body.engagementId).single();
    if (!eng) return NextResponse.json({ error: 'engagement_not_found' }, { status: 404 });

    // Resolve the driver's user id.
    let driverUserId: string | null = null;
    if (eng.driver_id) {
      const { data: dp } = await A.from('driver_profiles').select('user_id').eq('id', eng.driver_id).single();
      driverUserId = dp?.user_id ?? null;
    }

    const raiser = body.raisedBy === 'customer' ? eng.customer_user_id : driverUserId;
    const respondent = body.raisedBy === 'customer' ? driverUserId : eng.customer_user_id;
    if (!raiser) {
      return NextResponse.json({ error: 'no_raiser', message: `This engagement has no ${body.raisedBy} account to attribute the complaint to.` }, { status: 400 });
    }

    const caseNumber = `DSP-${Date.now().toString(36).toUpperCase()}`;
    const { data: inserted, error } = await A.from('disputes').insert({
      case_number: caseNumber,
      engagement_id: body.engagementId,
      raised_by_user_id: raiser,
      respondent_user_id: respondent,
      category: body.category,
      severity: body.severity,
      status: 'raised',
      summary: body.summary,
    }).select('id').single();
    if (error || !inserted) return NextResponse.json({ error: 'create_failed', message: error?.message ?? 'unknown' }, { status: 500 });

    try {
      await A.from('audit_logs').insert({ actor_user_id: user.id, actor_role: user.activeRole, entity_type: 'dispute', entity_id: inserted.id, action: 'create', metadata: { case_number: caseNumber, category: body.category, severity: body.severity } });
    } catch { /* best-effort */ }

    return NextResponse.json({ ok: true, id: inserted.id, caseNumber });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.code }, { status: err.status });
    console.error('[admin disputes POST]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
