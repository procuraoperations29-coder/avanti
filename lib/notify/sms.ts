import 'server-only';

/**
 * SMS via Termii (same integration as app/api/auth/sms-hook). Reads TERMII_*
 * straight from process.env and mock-guards when the key is absent so flows
 * are testable in dev. Used for driver alerts — a new booking they need to
 * see even if they never open the app.
 */
const TERMII_BASE = 'https://api.ng.termii.com';

export interface SmsResult {
  sent: boolean;
  mock: boolean;
}

/** Termii wants digits only; Nigerian 0-prefix -> 234. */
export function normalizePhone(raw: string): string {
  let p = raw.replace(/[^\d+]/g, '').replace(/^\+/, '');
  if (p.startsWith('0') && p.length === 11) p = '234' + p.slice(1);
  return p;
}

export async function sendSMS(input: { to: string; message: string }): Promise<SmsResult> {
  const key = process.env.TERMII_API_KEY;
  const senderId = process.env.TERMII_SENDER_ID ?? 'N-Alert';
  if (!key) {
    console.log(`[sms:mock] -> ${input.to}: ${input.message}`);
    return { sent: false, mock: true };
  }
  try {
    const res = await fetch(`${TERMII_BASE}/api/sms/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        to: normalizePhone(input.to),
        from: senderId,
        sms: input.message,
        type: 'plain',
        channel: 'dnd',
        api_key: key,
      }),
    });
    const body = (await res.json().catch(() => ({}))) as { code?: string; message?: string };
    if (!res.ok || body.code === 'FAILED') {
      console.error('[sms] Termii error', body);
      return { sent: false, mock: false };
    }
    return { sent: true, mock: false };
  } catch (err) {
    console.error('[sms] Termii threw', err);
    return { sent: false, mock: false };
  }
}
