import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthUser, AuthError } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * PATCH /api/admin/staff/[roleId]
 *
 * roleId is a user_roles.id — operating on the specific role
 * assignment rather than the user, since one person could in
 * principle hold more than one staff role with different approvers.
 *
 * Body: { action: 'activate' | 'deactivate' | 'suspend' | 'unsuspend' | 'update_approver',
 *         reason?: string, approverUserId?: string, requiresApproval?: boolean }
 */

const bodySchema = z.object({
  action: z.enum(['activate', 'deactivate', 'suspend', 'unsuspend', 'update_approver']),
  reason: z.string().max(500).optional(),
  approverUserId: z.string().uuid().nullable().optional(),
  requiresApproval: z.boolean().optional(),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ roleId: string }> }) {
  try {
    const user = await requireAuthUser();
    if (!user.roles.includes('super_admin')) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const { roleId } = await ctx.params;

    let body: z.infer<typeof bodySchema>;
    try {
      body = bodySchema.parse(await req.json());
    } catch (err) {
      return NextResponse.json(
        { error: 'invalid_body', details: err instanceof z.ZodError ? err.errors : String(err) },
        { status: 400 }
      );
    }

    const admin = createServiceRoleClient();

    let update: Record<string, unknown> = {};
    switch (body.action) {
      case 'activate':
        update = { revoked_at: null };
        break;
      case 'deactivate':
        update = { revoked_at: new Date().toISOString() };
        break;
      case 'suspend':
        update = { suspended: true, suspended_reason: body.reason ?? null };
        break;
      case 'unsuspend':
        update = { suspended: false, suspended_reason: null, suspended_until: null };
        break;
      case 'update_approver':
        if (body.requiresApproval && !body.approverUserId) {
          return NextResponse.json(
            { error: 'invalid_body', message: 'approverUserId is required when requiresApproval is true' },
            { status: 400 }
          );
        }
        update = {
          approver_user_id: body.approverUserId ?? null,
          ...(body.requiresApproval !== undefined ? { requires_approval: body.requiresApproval } : {}),
        };
        break;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (admin as any)
      .from('user_roles')
      .update(update)
      .eq('id', roleId);

    if (error) {
      return NextResponse.json({ error: 'update_failed', message: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.code }, { status: err.status });
    }
    console.error('[staff PATCH]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
