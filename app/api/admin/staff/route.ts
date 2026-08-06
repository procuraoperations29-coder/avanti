import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthUser, AuthError } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email/resend';
import { brandedEmail } from '@/lib/email/templates/branded';

/** What each department gets to see in the console — used in the invite email. */
const ROLE_INFO: Record<string, { dept: string; access: string }> = {
  admin_verifier: { dept: 'Verification', access: 'the driver verification queue — reviewing and approving driver applications.' },
  admin_support: { dept: 'Support', access: 'users, trips, corporate accounts, and placements.' },
  admin_finance: { dept: 'Finance', access: 'finance, payout batches, and rate-card / pricing management.' },
  admin_compliance: { dept: 'Compliance', access: 'disputes, NDPR/GDPR data requests, sanctions screening, audit log, and compliance reports.' },
  super_admin: { dept: 'Super admin', access: 'the entire admin console, including staff and user management.' },
};
const SIGN_IN_URL = 'https://www.avanti.com.ng/sign-in';

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

const STAFF_ROLES = ['admin_verifier', 'admin_support', 'admin_finance', 'admin_compliance', 'super_admin'] as const;

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

    // Invite email — tell them they've been added, what they can access, and how
    // to sign in (passwordless: they enter this email and get a one-time code).
    const info = ROLE_INFO[body.role] ?? { dept: body.role, access: 'the admin console.' };
    let emailed = false;
    try {
      await sendEmail({
        to: body.email,
        subject: `You've been added to the Avanti admin console — ${info.dept}`,
        html: brandedEmail({
          eyebrow: 'Admin access',
          greeting: `Hi ${body.fullName.split(' ')[0] || 'there'},`,
          headline: `You're set up as ${info.dept}`,
          paragraphs: [
            `You've been added to the Avanti admin console as <strong>${info.dept}</strong>. Your role gives you access to ${info.access}`,
            'To get in, click below and sign in with this email address — we’ll send you a one-time code. No password to set up.',
          ],
          summary: [
            { label: 'Department', value: info.dept },
            { label: 'Sign in with', value: body.email },
          ],
          cta: { label: 'Sign in to the console', url: SIGN_IN_URL },
          footerNote: 'If you weren’t expecting this, you can ignore this email.',
        }),
      });
      emailed = true;
    } catch (err) {
      console.error('[staff POST] invite email failed', err);
    }

    return NextResponse.json({ ok: true, userId: targetUserId, emailed });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.code }, { status: err.status });
    }
    console.error('[staff POST]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
