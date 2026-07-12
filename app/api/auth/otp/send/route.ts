import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/auth/otp/send
 *
 * Body: { phone: E.164, isSignup: bool, fullName?, countryCode? }
 *
 * Uses Supabase's built-in phone provider. Configure Twilio (or another
 * SMS provider) in Supabase dashboard → Authentication → Providers → Phone
 * for real delivery. Without it, this route will error with a provider
 * message — that's Supabase telling you to configure the provider.
 *
 * For pure local dev without an SMS provider, use Supabase's test phone
 * numbers (Authentication → Providers → Phone → Test OTP).
 */

const bodySchema = z.object({
  phone: z.string().regex(/^\+[1-9]\d{1,14}$/, 'Phone must be E.164 format'),
  isSignup: z.boolean().default(false),
  fullName: z.string().min(1).max(200).optional(),
  countryCode: z.string().length(2).default('NG'),
  preferredLanguage: z.string().length(2).default('en'),
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

  const { error } = await supabase.auth.signInWithOtp({
    phone: body.phone,
    options: {
      shouldCreateUser: body.isSignup,
      data: body.isSignup
        ? {
            full_name: body.fullName,
            country_code: body.countryCode,
            preferred_language: body.preferredLanguage,
          }
        : undefined,
    },
  });

  if (error) {
    // Supabase returns a specific error when shouldCreateUser is false
    // and the user doesn't exist — surface it as 404 for cleaner UI.
    const msg = error.message.toLowerCase();
    if (msg.includes('signups not allowed') || msg.includes('user not found')) {
      return NextResponse.json({ error: 'user_not_found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'otp_send_failed', message: error.message }, { status: 400 });
  }

  return NextResponse.json({ sent: true });
}
