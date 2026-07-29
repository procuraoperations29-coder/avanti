import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthUser, AuthError } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * POST /api/admin/staff
 *
 * Creates a new staff member (or adds a staff role to an existing
 * account, if the email already belongs to one — same one-person,
 * multiple-roles model already used for drivers/customers).
 *
 * NOTE: this uses createServiceRoleClient().auth.admin.createUser().
 * That client is the same one used everywhere else in the app to
 * bypass RLS, which means it's instantiated with the service role
 * key — and any supabase-js client built with the service role key
 * exposes .auth.admin for free, it isn't a separate opt-in. If this
 * assumption is wrong (e.g. createServiceRoleClient wraps/restricts
 * the client to only .from() methods), this specific call is the one
 * that will fail — everything else in this route doesn't depend on it.
 */

const STAFF_ROLES = ['admin_verifier', 'admin_support', 'admin_finance', 'admin_compliance'] as const;

const bodySchema = z
  .object({
    email: z.string().email(),
    fullName: z.string().min(1).max(200),
    role: z.enum(STAFF_ROLES),
    requiresApproval: z.boolean().default(true),
    approverUserId: z.string().uuid().nullable().default(null),
  })
  .refine((b) => !b.requiresApproval || b.approverUserId, {
    message: 'approverUserId is required when requiresApproval is true',
    path: ['approverUserId'],
  });

export async function POST(req: Request) {
  try {
    const user = await requireAuthUser();
    if (!user.roles.includes('super_admin')) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingUser } = await (admin as any)
      .from('users')
      .select('id')
      .eq('email', body.email)
      .maybeSingle();

    let targetUserId: string;

    if (existingUser) {
      targetUserId = existingUser.id;
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: created, error: createError } = await (admin as any).auth.admin.createUser({
        email: body.email,
        email_confirm: true,
        user_metadata: { full_name: body.fullName },
      });

      if (createError || !created?.user) {
        return NextResponse.json(
          {
            error: 'create_user_failed',
            message: createError?.message ?? 'Could not create the auth account',
          },
          { status: 500 }
        );
      }
      targetUserId = created.user.id;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingRole } = await (admin as any)
      .from('user_roles')
      .select('id')
      .eq('user_id', targetUserId)
      .eq('role', body.role)
      .is('revoked_at', null)
      .maybeSingle();

    if (existingRole) {
      return NextResponse.json(
        { error: 'role_already_assigned', message: 'This person already has that role.' },
        { status: 409 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: roleError } = await (admin as any).from('user_roles').insert({
      user_id: targetUserId,
      role: body.role,
      requires_approval: body.requiresApproval,
      approver_user_id: body.approverUserId,
    });

    if (roleError) {
      return NextResponse.json(
        { error: 'role_assign_failed', message: roleError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, userId: targetUserId });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.code }, { status: err.status });
    }
    console.error('[staff POST]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
