import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthUser, AuthError } from '@/lib/auth';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';

/**
 * POST /api/auth/password/set
 *
 * Sets (or changes) the current user's password. Requires an authenticated
 * session — i.e. the user has just verified an email OTP (signup or recovery)
 * or is already signed in (Settings). Also flips public.users.has_password so
 * the app knows to stop prompting them.
 */
const bodySchema = z.object({
  password: z.string().min(8, 'Use at least 8 characters').max(200),
});

export async function POST(req: Request) {
  try {
    const user = await requireAuthUser();

    let body: z.infer<typeof bodySchema>;
    try {
      body = bodySchema.parse(await req.json());
    } catch (err) {
      return NextResponse.json(
        { error: 'invalid_body', message: err instanceof z.ZodError ? (err.errors[0]?.message ?? 'Invalid password') : String(err) },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser({ password: body.password });
    if (error) {
      return NextResponse.json({ error: 'set_failed', message: error.message }, { status: 400 });
    }

    const admin = createServiceRoleClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any).from('users').update({ has_password: true }).eq('id', user.id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.code, message: err.message }, { status: err.status });
    console.error('[auth/password/set]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
