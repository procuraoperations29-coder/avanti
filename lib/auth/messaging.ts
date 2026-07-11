import 'server-only';
import { serverEnv } from '@/config/env';

/**
 * OTP messaging adapter.
 *
 * Two implementations:
 *   - Console adapter for local dev (prints the code to the server log).
 *   - Twilio Verify adapter when TWILIO_* env vars are set.
 *
 * Callers use `sendOtp(phone)` and `verifyOtp(phone, code)` — same signature
 * regardless of provider. Phase 4 §6.2.
 */

export interface MessagingAdapter {
  sendOtp(phone: string): Promise<{ sid: string | null; status: 'pending' | 'sent' }>;
  verifyOtp(phone: string, code: string): Promise<{ approved: boolean }>;
}

class ConsoleAdapter implements MessagingAdapter {
  // In-memory codes for local dev. NEVER use in production.
  private codes = new Map<string, { code: string; expiresAt: number }>();

  async sendOtp(phone: string) {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    this.codes.set(phone, { code, expiresAt: Date.now() + 5 * 60 * 1000 });
    console.log(`\n[dev-otp] ${phone} -> ${code}  (valid 5 min)\n`);
    return { sid: null, status: 'sent' as const };
  }

  async verifyOtp(phone: string, code: string) {
    const entry = this.codes.get(phone);
    if (!entry) return { approved: false };
    if (entry.expiresAt < Date.now()) {
      this.codes.delete(phone);
      return { approved: false };
    }
    if (entry.code !== code) return { approved: false };
    this.codes.delete(phone);
    return { approved: true };
  }
}

class TwilioAdapter implements MessagingAdapter {
  constructor(
    private accountSid: string,
    private authToken: string,
    private serviceSid: string
  ) {}

  private async request(path: string, params: Record<string, string>) {
    const url = `https://verify.twilio.com/v2/Services/${this.serviceSid}${path}`;
    const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(params).toString(),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Twilio ${res.status}: ${body}`);
    }
    return res.json();
  }

  async sendOtp(phone: string) {
    const data = (await this.request('/Verifications', {
      To: phone,
      Channel: 'sms',
    })) as { sid: string; status: string };
    return { sid: data.sid, status: data.status as 'pending' | 'sent' };
  }

  async verifyOtp(phone: string, code: string) {
    const data = (await this.request('/VerificationCheck', {
      To: phone,
      Code: code,
    })) as { status: string };
    return { approved: data.status === 'approved' };
  }
}

let cached: MessagingAdapter | null = null;

export function messagingAdapter(): MessagingAdapter {
  if (cached) return cached;
  const env = serverEnv();
  if (env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_MESSAGING_SERVICE_SID) {
    cached = new TwilioAdapter(
      env.TWILIO_ACCOUNT_SID,
      env.TWILIO_AUTH_TOKEN,
      env.TWILIO_MESSAGING_SERVICE_SID
    );
  } else {
    cached = new ConsoleAdapter();
  }
  return cached;
}
