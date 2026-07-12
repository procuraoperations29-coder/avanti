import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthUser, AuthError } from '@/lib/auth';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';

/**
 * POST /api/auth/signup/driver
 *
 * Completes driver signup. Creates a driver_profiles row at tier t0
 * (verification pending) and assigns the driver role.
 *
 * Real onboarding (documents, background check) is Slice 5. This just
 * establishes the account.
 */

const bodySchema = z.object({
  fullName: z.string().min(1).max(200).optional(),
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

    if (user.roles.includes('driver')) {
      return NextResponse.json({ success: true, alreadyCompleted: true });
    }

    const supabase = await createClient();
    const admin = createServiceRoleClient();

    if (body.fullName) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await supabase.from('users').update({ full_name: body.fullName } as any).eq('id', user.id);
      if (error) console.error('[signup/driver] users update failed', error);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: profileErr } = await (admin as any).from('driver_profiles').insert({
      user_id: user.id,
      verification_tier: 't0',
      verification_status: 'not_started',
    });
    if (profileErr && !profileErr.message?.includes('duplicate')) {
      console.error('[signup/driver] driver_profiles insert failed', profileErr);
      return NextResponse.json(
        { error: 'profile_create_failed', message: profileErr.message },
        { status: 500 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: roleErr } = await (admin as any).from('user_roles').insert({
      user_id: user.id,
      role: 'driver',
    });
    if (roleErr) {
      console.error('[signup/driver] user_roles insert failed', roleErr);
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
    console.error('[signup/driver] unexpected', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
