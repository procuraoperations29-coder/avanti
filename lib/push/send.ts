import 'server-only';
import webpush from 'web-push';

/**
 * Web Push sender. Reads VAPID keys from env; if they're missing it no-ops
 * (returns skipped) so nothing breaks before the keys are configured.
 *
 *   NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:)
 */
export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

let configured: boolean | null = null;
function ensureConfigured(): boolean {
  if (configured !== null) return configured;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:hello@avanti.com.ng';
  if (!pub || !priv) {
    configured = false;
    return false;
  }
  try {
    webpush.setVapidDetails(subject, pub, priv);
    configured = true;
  } catch {
    configured = false;
  }
  return configured;
}

interface SubRow { id: string; endpoint: string; p256dh: string; auth: string }

async function deliver(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  subs: SubRow[],
  payload: PushPayload
): Promise<{ sent: number; failed: number; skipped: number }> {
  if (!ensureConfigured()) return { sent: 0, failed: 0, skipped: subs.length };
  const body = JSON.stringify(payload);
  let sent = 0;
  let failed = 0;
  const dead: string[] = [];
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body);
        sent++;
      } catch (err: unknown) {
        failed++;
        const code = (err as { statusCode?: number })?.statusCode;
        if (code === 404 || code === 410) dead.push(s.id); // gone — clean up
      }
    })
  );
  if (dead.length) {
    try {
      await admin.from('push_subscriptions').update({ revoked_at: new Date().toISOString() }).in('id', dead);
    } catch { /* best-effort */ }
  }
  return { sent, failed, skipped: 0 };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function activeSubs(admin: any, filter?: (q: any) => any): Promise<SubRow[]> {
  try {
    let q = admin.from('push_subscriptions').select('id, endpoint, p256dh, auth').is('revoked_at', null);
    if (filter) q = filter(q);
    const { data } = await q;
    return data ?? [];
  } catch {
    return []; // table not migrated yet, etc. — never throw from a notification path
  }
}

/** Send a push to every active subscription belonging to one user. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function sendPushToUser(admin: any, userId: string, payload: PushPayload) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subs = await activeSubs(admin, (q: any) => q.eq('user_id', userId));
  return deliver(admin, subs, payload);
}

/** Broadcast a push to all active subscribers. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function sendPushToAll(admin: any, payload: PushPayload) {
  const subs = await activeSubs(admin);
  return deliver(admin, subs, payload);
}

export function pushConfigured(): boolean {
  return ensureConfigured();
}
