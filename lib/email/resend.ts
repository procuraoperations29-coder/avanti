import 'server-only';
import { serverEnv } from '@/config/env';

/**
 * Email via Resend's HTTP API (fetch, no SDK — mirrors lib/payments/paystack.ts).
 *
 * Mock mode: if RESEND_API_KEY / RESEND_FROM_EMAIL are absent, logs and no-ops
 * instead of sending, so flows are testable in dev without real email.
 */
const RESEND_ENDPOINT = 'https://api.resend.com/emails';

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

export interface SendEmailResult {
  sent: boolean;
  mock: boolean;
  id?: string;
}

export function emailConfigured(): boolean {
  const env = serverEnv();
  return Boolean(env.RESEND_API_KEY && env.RESEND_FROM_EMAIL);
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const env = serverEnv();
  if (!env.RESEND_API_KEY || !env.RESEND_FROM_EMAIL) {
    console.log(`[email:mock] "${input.subject}" -> ${input.to}`);
    return { sent: false, mock: true };
  }

  const res = await fetch(RESEND_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.RESEND_FROM_EMAIL,
      to: input.to,
      subject: input.subject,
      html: input.html,
      reply_to: input.replyTo,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`resend_failed: ${res.status} ${body}`);
  }

  const data = (await res.json()) as { id?: string };
  return { sent: true, mock: false, id: data.id };
}
