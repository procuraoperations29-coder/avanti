import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/auth/otp/verify
 *
 * Body: { email, code }
 * Verifies the email OTP and establishes a session via SSR cookies.
 */

const bodySchema = z.object({
  email: z.string().email(),
  code: z.string().length(6).regex(/^\d{6}$/, 'Code must be 6 digits'),
});

export async function POST(req: Request) {
  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: 'invalid_body', details: err instanceof z.ZodError ? err.errors : String(err) },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.verifyOtp({
    email: body.email,
    token: body.code,
    type: 'email',
  });

  if (error || !data.user) {
    return NextResponse.json(
      { error: 'otp_verify_failed', message: error?.message ?? 'Verification failed' },
      { status: 401 }
    );
  }

  const app = (data.user.app_metadata ?? {}) as Record<string, unknown>;
  const roles = Array.isArray(app.roles) ? (app.roles as string[]) : [];
  const activeRole = typeof app.active_role === 'string' ? app.active_role : null;

  return NextResponse.json({
    userId: data.user.id,
    activeRole,
    needsCompletion: roles.length === 0,
  });
}
