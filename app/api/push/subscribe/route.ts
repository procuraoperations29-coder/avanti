import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthUser, AuthError } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';

/** POST /api/push/subscribe — store a web-push subscription for the signed-in user. */
const bodySchema = z.object({
  subscription: z.object({
    endpoint: z.string().url(),
    keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
  }),
  deviceId: z.string().max(64).optional(),
  platform: z.enum(['ios', 'android', 'desktop', 'other']).optional(),
});

export async function POST(req: Request) {
  try {
    const user = await requireAuthUser();
    let body: z.infer<typeof bodySchema>;
    try {
      body = bodySchema.parse(await req.json());
    } catch {
      return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
    }

    const admin = createServiceRoleClient();
    const now = new Date().toISOString();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (admin as any).from('push_subscriptions').upsert(
      {
        user_id: user.id,
        device_id: body.deviceId ?? null,
        endpoint: body.subscription.endpoint,
        p256dh: body.subscription.keys.p256dh,
        auth: body.subscription.keys.auth,
        platform: body.platform ?? null,
        user_agent: req.headers.get('user-agent')?.slice(0, 400) ?? null,
        revoked_at: null,
        last_used_at: now,
      },
      { onConflict: 'endpoint' }
    );
    if (error) return NextResponse.json({ error: 'save_failed', message: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.code }, { status: err.status });
    console.error('[push subscribe]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
