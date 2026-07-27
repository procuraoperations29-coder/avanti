import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';

/**
 * POST /api/auth/otp/send
 *
 * Body: { email, isSignup?, fullName?, phone?, countryCode?, preferredLanguage? }
 *
 * Uses Supabase's built-in email OTP. No SMS provider needed — Supabase
 * sends the code via its default email service.
 *
 * Users receive both a magic link AND a 6-digit code. Our UI uses the
 * code path.
 *
 * For signup, we stash the optional phone number in user_metadata so
 * downstream signup routes can pick it up as a contact number (it's
 * no longer the auth identity).
 *
 * NOTE: signInWithOtp with shouldCreateUser: true creates the auth.users
 * row synchronously, right here at send time — which fires
 * fn_handle_new_auth_user() (see 20260811000000_jwt_claim_shaping.sql),
 * which inserts into public.users. That insert has no protection against
 * a phone number that's already attached to a different account —
 * users.phone has its own unique constraint separate from the id-based
 * on-conflict guard. Without this check, that hits Postgres error 23505
 * mid-transaction and Supabase reports it back as an opaque
 * "Database error saving new user." This check catches it before we
 * ever attempt account creation, with a message the UI can actually show.
 */
const bodySchema = z.object({
  email: z.string().email(),
  isSignup: z.boolean().default(false),
  fullName: z.string().min(1).max(200).optional(),
  phone: z.string().optional(),
  countryCode: z.string().length(2).default('NG'),
  preferredLanguage: z.string().length(2).default('en'),
});

function normalizePhone(phone: string): string {
  return phone.startsWith('+') ? phone : `+${phone}`;
}

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

  if (body.isSignup && body.phone) {
    const normalizedPhone = normalizePhone(body.phone);
    const admin = createServiceRoleClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing } = await (admin as any)
      .from('users')
      .select('id, email')
      .eq('phone', normalizedPhone)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        {
          error: 'phone_taken',
          message:
            'An account already exists with this phone number. Sign in instead — you can add another role (driver, customer, etc.) from your existing account.',
        },
        { status: 409 }
      );
    }
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: body.email,
    options: {
      shouldCreateUser: body.isSignup,
      data: body.isSignup
        ? {
            full_name: body.fullName,
            phone: body.phone,
            country_code: body.countryCode,
            preferred_language: body.preferredLanguage,
          }
        : undefined,
    },
  });

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('signups not allowed') || msg.includes('user not found')) {
      return NextResponse.json({ error: 'user_not_found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'otp_send_failed', message: error.message }, { status: 400 });
  }

  return NextResponse.json({ sent: true });
}