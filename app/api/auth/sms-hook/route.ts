import { NextResponse } from 'next/server';
import { Webhook } from 'standardwebhooks';

/**
 * Supabase Send SMS Hook — receives webhook when Supabase Auth needs to
 * send an OTP, and dispatches via Termii.
 *
 * Supabase config: Dashboard → Auth → Hooks → Send SMS Hook
 *   URL:    https://www.avanti.com.ng/api/auth/sms-hook
 *   Secret: SEND_SMS_HOOK_SECRET env var
 *
 * Webhook payload shape (per Supabase docs):
 * {
 *   user: { id, phone, ... },
 *   sms: { otp: '123456', ... }
 * }
 *
 * We verify the signature to make sure this request actually came from
 * Supabase, then call Termii's send-token endpoint with the OTP.
 */

export const dynamic = 'force-dynamic';

interface SmsHookPayload {
  user: { id: string; phone: string };
  sms: { otp: string };
}

interface TermiiResponse {
  message_id?: string;
  message?: string;
  code?: string;
  balance?: number;
  user?: string;
}

export async function POST(req: Request) {
  const hookSecret = process.env.SEND_SMS_HOOK_SECRET;
  const termiiKey = process.env.TERMII_API_KEY;
  const senderId = process.env.TERMII_SENDER_ID ?? 'N-Alert';

  if (!hookSecret || !termiiKey) {
    console.error('[sms-hook] missing env vars', {
      hasSecret: !!hookSecret,
      hasKey: !!termiiKey,
    });
    return NextResponse.json({ error: 'server_misconfigured' }, { status: 500 });
  }

  // Read raw body + headers for signature verification
  const rawBody = await req.text();
  const headers: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    headers[key] = value;
  });

  // Verify the signature using standardwebhooks
  let payload: SmsHookPayload;
  try {
    const wh = new Webhook(hookSecret);
    payload = wh.verify(rawBody, headers) as SmsHookPayload;
  } catch (err) {
    console.error('[sms-hook] signature verification failed:', err);
    return NextResponse.json({ error: 'invalid_signature' }, { status: 401 });
  }

  const { user, sms } = payload;
  if (!user?.phone || !sms?.otp) {
    return NextResponse.json(
      { error: 'invalid_payload', got: { user: !!user, sms: !!sms } },
      { status: 400 }
    );
  }

  // Termii wants phone in international format without leading +
  const phone = user.phone.replace(/^\+/, '');

  // The message text — this is what the user sees on their phone
  const message =
    `${sms.otp} is your Avanti verification code. ` +
    `Don't share it. Expires in 5 minutes.`;

  try {
    const res = await fetch('https://api.ng.termii.com/api/sms/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  body: JSON.stringify({
    to: phone,
    from: senderId,
    sms: message,
    type: 'plain',
    channel: 'dnd',
    api_key: termiiKey,
  }),
});

    const body = (await res.json()) as TermiiResponse;

    if (!res.ok || body.code === 'FAILED') {
      console.error('[sms-hook] Termii returned error:', body);
      return NextResponse.json(
        { error: 'termii_failed', message: body.message ?? 'unknown' },
        { status: 500 }
      );
    }

    console.log('[sms-hook] SMS sent', {
      messageId: body.message_id,
      balance: body.balance,
      phone,
    });

    return NextResponse.json({});
  } catch (err) {
    console.error('[sms-hook] Termii call threw:', err);
    return NextResponse.json({ error: 'termii_unreachable' }, { status: 500 });
  }
}
