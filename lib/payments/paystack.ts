import 'server-only';
import { serverEnv } from '@/config/env';

/**
 * Paystack integration.
 *
 * Two modes:
 *   - Real: PAYSTACK_SECRET_KEY is set. Calls Paystack's API.
 *   - Mock: key absent. Simulates a successful transaction. Redirect URL
 *     points back to our callback with success=true and a fake reference.
 *
 * Mock mode is what makes the whole booking flow testable in dev
 * without needing a Paystack account. Production uses real mode.
 */

const PAYSTACK_BASE = 'https://api.paystack.co';

export interface InitTransactionInput {
  email: string;
  amountNaira: number; // Paystack wants kobo, we convert
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
}

export interface InitTransactionResult {
  authorizationUrl: string;
  reference: string;
  mock: boolean;
}

export interface VerifyTransactionResult {
  status: 'success' | 'failed' | 'abandoned' | 'pending';
  reference: string;
  amountNaira: number;
  paidAt: string | null;
  channel: string | null;
  mock: boolean;
}

function hasPaystackConfig(): boolean {
  const env = serverEnv();
  return Boolean(env.PAYSTACK_SECRET_KEY && env.PAYSTACK_SECRET_KEY.length > 0);
}

export async function initTransaction(input: InitTransactionInput): Promise<InitTransactionResult> {
  if (!hasPaystackConfig()) {
    // Mock: point back at our callback route with success=true. Client
    // does window.location = url; the callback verifies (still mocked)
    // and confirms the engagement.
    const url = new URL(input.callbackUrl);
    url.searchParams.set('reference', input.reference);
    url.searchParams.set('mock', 'true');
    return {
      authorizationUrl: url.toString(),
      reference: input.reference,
      mock: true,
    };
  }

  const env = serverEnv();
  const res = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: input.email,
      amount: Math.round(input.amountNaira * 100), // kobo
      reference: input.reference,
      callback_url: input.callbackUrl,
      metadata: input.metadata ?? {},
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`paystack_init_failed: ${res.status} ${body}`);
  }

  const data = (await res.json()) as {
    status: boolean;
    data: { authorization_url: string; reference: string };
  };

  if (!data.status) {
    throw new Error('paystack_init_returned_error');
  }

  return {
    authorizationUrl: data.data.authorization_url,
    reference: data.data.reference,
    mock: false,
  };
}

export interface RefundResult {
  ok: boolean;
  providerRef: string | null;
  mock: boolean;
}

/**
 * Refund a transaction (full, or a partial amount in Naira). Returns ok=false
 * rather than throwing on a provider error, so the caller can still record the
 * refund intent and let ops reconcile.
 */
export async function refundTransaction(reference: string, amountNaira?: number): Promise<RefundResult> {
  if (!hasPaystackConfig()) {
    return { ok: true, providerRef: `mock-refund-${reference}`, mock: true };
  }
  try {
    const env = serverEnv();
    const body: Record<string, unknown> = { transaction: reference };
    if (amountNaira != null) body.amount = Math.round(amountNaira * 100); // kobo
    const res = await fetch(`${PAYSTACK_BASE}/refund`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => null)) as { status?: boolean; data?: { id?: number | string } } | null;
    if (!res.ok || !data?.status) return { ok: false, providerRef: null, mock: false };
    return { ok: true, providerRef: data.data?.id != null ? String(data.data.id) : null, mock: false };
  } catch (err) {
    console.error('[paystack refund]', err);
    return { ok: false, providerRef: null, mock: false };
  }
}

export async function verifyTransaction(reference: string): Promise<VerifyTransactionResult> {
  if (!hasPaystackConfig()) {
    // Mock: any reference passed to verify comes back successful.
    return {
      status: 'success',
      reference,
      amountNaira: 0, // filled in by caller from the engagement
      paidAt: new Date().toISOString(),
      channel: 'mock',
      mock: true,
    };
  }

  const env = serverEnv();
  const res = await fetch(`${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: {
      Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`paystack_verify_failed: ${res.status} ${body}`);
  }

  const data = (await res.json()) as {
    status: boolean;
    data: {
      status: 'success' | 'failed' | 'abandoned' | 'pending';
      reference: string;
      amount: number;
      paid_at: string | null;
      channel: string | null;
    };
  };

  return {
    status: data.data.status,
    reference: data.data.reference,
    amountNaira: data.data.amount / 100,
    paidAt: data.data.paid_at,
    channel: data.data.channel,
    mock: false,
  };
}

/**
 * Verify a Paystack webhook signature using HMAC-SHA512 on the raw body.
 * The comparison is constant-time.
 */
export async function verifyWebhookSignature(rawBody: string, signature: string): Promise<boolean> {
  if (!hasPaystackConfig()) return false;
  const env = serverEnv();
  const key = env.PAYSTACK_WEBHOOK_SECRET;
  if (!key) return false;

  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(key),
    { name: 'HMAC', hash: 'SHA-512' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(rawBody));
  const expected = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return diff === 0;
}

export function paystackConfigured(): boolean {
  return hasPaystackConfig();
}
