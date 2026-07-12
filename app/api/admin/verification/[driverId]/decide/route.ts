import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthUser, AuthError, serviceRoleWrite } from '@/lib/auth';

/**
 * POST /api/admin/verification/[driverId]/decide
 *
 * Body: { decision: 'approve' | 'reject' | 'more_info', rationale, tier? }
 *
 * Records a verification_events row. The Slice 2 trigger
 * fn_apply_verification_event then updates driver_profiles.verification_status
 * (and for approve, verification_tier).
 *
 * Uses serviceRoleWrite so identity + permissions are re-verified and an
 * audit_logs row is created. Rationale is required for verification.decide.
 */

const bodySchema = z.object({
  decision: z.enum(['approve', 'reject', 'more_info']),
  rationale: z.string().min(10).max(2000),
  tier: z.enum(['t1', 't2', 't3', 't4']).optional(),
});

export async function POST(
  req: Request,
  ctx: { params: Promise<{ driverId: string }> }
) {
  try {
    const user = await requireAuthUser();
    const { driverId } = await ctx.params;

    let body: z.infer<typeof bodySchema>;
    try {
      body = bodySchema.parse(await req.json());
    } catch (err) {
      return NextResponse.json({ error: 'invalid_body', details: String(err) }, { status: 400 });
    }

    if (body.decision === 'approve' && !body.tier) {
      return NextResponse.json(
        { error: 'tier_required_for_approval' },
        { status: 400 }
      );
    }

    const eventType =
      body.decision === 'approve'
        ? 'approved'
        : body.decision === 'reject'
        ? 'rejected'
        : 'more_info_requested';

    await serviceRoleWrite({
      actor: user,
      permission: 'verification.decide',
      action: eventType,
      entityType: 'driver_profiles',
      entityId: driverId,
      rationale: body.rationale,
      metadata: {
        decision: body.decision,
        tier: body.tier ?? null,
      },
      work: async (client) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: profile } = await (client as any)
          .from('driver_profiles')
          .select('verification_tier')
          .eq('id', driverId)
          .single();
        const fromTier = profile?.verification_tier ?? 't0';

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (client as any).from('verification_events').insert({
          driver_id: driverId,
          event_type: eventType,
          from_tier: fromTier,
          to_tier: body.tier ?? null,
          actor_user_id: user.id,
          rationale: body.rationale,
        });
        if (error) throw new Error(`event insert failed: ${error.message}`);
      },
    });

    return NextResponse.json({ ok: true, decision: body.decision });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.code, message: err.message }, { status: err.status });
    }
    console.error('[admin/verification/decide]', err);
    return NextResponse.json({ error: 'internal_error', message: String(err) }, { status: 500 });
  }
}
