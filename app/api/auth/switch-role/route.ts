import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthUser, AuthError } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * POST /api/auth/switch-role
 *
 * Body: { role, organizationId? }
 *
 * Changes the JWT's active_role and active_organization_id. Verifies the
 * user actually holds that (role, org) combination before switching.
 *
 * Client must call supabase.auth.refreshSession() after this returns to
 * pick up the new claims.
 */

const bodySchema = z.object({
  role: z.enum([
    'individual_customer',
    'driver',
    'corporate_admin',
    'corporate_member',
    'admin_verifier',
    'admin_support',
    'admin_finance',
    'admin_compliance',
    'super_admin',
  ]),
  organizationId: z.string().uuid().nullable().optional(),
});

export async function POST(req: Request) {
  try {
    const user = await requireAuthUser();

    let body: z.infer<typeof bodySchema>;
    try {
      body = bodySchema.parse(await req.json());
    } catch (err) {
      return NextResponse.json(
        { error: 'invalid_body', details: err instanceof z.ZodError ? err.errors : String(err) },
        { status: 400 }
      );
    }

    // 1. Verify the user actually holds this role.
    if (!user.roles.includes(body.role)) {
      return NextResponse.json(
        { error: 'role_not_held', message: `You do not hold role ${body.role}` },
        { status: 403 }
      );
    }

    // 2. For corporate roles, verify the org membership matches.
    const isCorporate = body.role === 'corporate_admin' || body.role === 'corporate_member';
    if (isCorporate) {
      if (!body.organizationId) {
        return NextResponse.json(
          { error: 'org_required', message: 'organizationId required for corporate roles' },
          { status: 400 }
        );
      }
      if (!user.organizationIds.includes(body.organizationId)) {
        return NextResponse.json(
          { error: 'not_org_member', message: 'You are not a member of that organization' },
          { status: 403 }
        );
      }
    }

    // 3. Update the app_metadata.
    const admin = createServiceRoleClient();

    // Fetch current metadata (Supabase merges shallowly, so we could just set
    // active_role, but we do a full read/write for safety).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adminAny = admin.auth.admin as any;
    const { data: userData, error: fetchErr } = await adminAny.getUserById(user.id);
    if (fetchErr || !userData?.user) {
      return NextResponse.json({ error: 'user_lookup_failed' }, { status: 500 });
    }

    const existingMeta = (userData.user.app_metadata ?? {}) as Record<string, unknown>;

    const { error: updateErr } = await adminAny.updateUserById(user.id, {
      app_metadata: {
        ...existingMeta,
        active_role: body.role,
        active_organization_id: isCorporate ? body.organizationId : null,
      },
    });
    if (updateErr) {
      console.error('[switch-role] updateUserById failed', updateErr);
      return NextResponse.json({ error: 'update_failed', message: updateErr.message }, { status: 500 });
    }

    // Also mirror to public.users.active_role for cheap reads
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any).from('users').update({ active_role: body.role }).eq('id', user.id);

    return NextResponse.json({
      success: true,
      activeRole: body.role,
      activeOrganizationId: isCorporate ? body.organizationId : null,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.code, message: err.message }, { status: err.status });
    }
    console.error('[switch-role] unexpected', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

// Silence unused import warning until we wire the env-based feature flag
