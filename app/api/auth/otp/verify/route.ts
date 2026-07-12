import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/auth/otp/verify
 *
 * Body: { phone, code }
 * Verifies the OTP with Supabase and establishes a session. On success,
 * cookies are set by the SSR client and subsequent requests are authenticated.
 *
 * Returns { user, activeRole, needsCompletion } — client decides where to route.
 */

const bodySchema = z.object({
  phone: z.string().regex(/^\+[1-9]\d{1,14}$/),
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
    phone: body.phone,
    token: body.code,
    type: 'sms',
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
    // If they have no roles, they haven't completed signup yet.
    needsCompletion: roles.length === 0,
  });
}
