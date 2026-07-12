import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthUser } from '@/lib/auth';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { AuthError } from '@/lib/auth';

/**
 * POST /api/auth/signup/customer
 *
 * Completes customer signup. Requires an authenticated session (i.e. the
 * user has already completed OTP verification via /api/auth/otp/verify).
 *
 * Assigns individual_customer role and creates a customer_profiles row.
 * The JWT claims are refreshed automatically by our db trigger; the client
 * should call supabase.auth.refreshSession() after this returns.
 */

const bodySchema = z.object({
  fullName: z.string().min(1).max(200).optional(),
  email: z.string().email().optional().or(z.literal('')),
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

    // Already has the role? No-op — idempotent.
    if (user.roles.includes('individual_customer')) {
      return NextResponse.json({ success: true, alreadyCompleted: true });
    }

    const supabase = await createClient();
    const admin = createServiceRoleClient();

    // Update public.users with name / email if provided.
    if (body.fullName || body.email) {
      const { error: usersErr } = await supabase
        .from('users')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update({
          ...(body.fullName ? { full_name: body.fullName } : {}),
          ...(body.email ? { email: body.email } : {}),
        } as any)
        .eq('id', user.id);
      if (usersErr) {
        console.error('[signup/customer] users update failed', usersErr);
      }
    }

    // Insert customer_profiles row (idempotent via unique on user_id).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: profileErr } = await (admin as any).from('customer_profiles').insert({
      user_id: user.id,
    });
    if (profileErr && !profileErr.message?.includes('duplicate')) {
      console.error('[signup/customer] customer_profiles insert failed', profileErr);
    }

    // Assign role — this triggers the JWT claim refresh.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: roleErr } = await (admin as any).from('user_roles').insert({
      user_id: user.id,
      role: 'individual_customer',
    });
    if (roleErr) {
      console.error('[signup/customer] user_roles insert failed', roleErr);
      return NextResponse.json(
        { error: 'role_assign_failed', message: roleErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.code, message: err.message }, { status: err.status });
    }
    console.error('[signup/customer] unexpected', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
