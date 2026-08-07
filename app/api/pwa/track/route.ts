import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthUser } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * POST /api/pwa/track — record a home-screen (installed) app launch.
 *
 * Called by the client when the app is running in standalone display mode, or
 * on the `appinstalled` event. Attaches the signed-in user when present so ops
 * can see who installed. Public endpoint (no auth required) — keyed by a
 * client-generated device id.
 */
const bodySchema = z.object({
  deviceId: z.string().min(8).max(64),
  platform: z.enum(['ios', 'android', 'desktop', 'other']).optional(),
  source: z.enum(['appinstalled', 'standalone_launch']).default('standalone_launch'),
  standalone: z.boolean().optional(),
});

export async function POST(req: Request) {
  try {
    let body: z.infer<typeof bodySchema>;
    try {
      body = bodySchema.parse(await req.json());
    } catch {
      return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
    }

    const user = await getAuthUser();
    const admin = createServiceRoleClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const A = admin as any;
    const now = new Date().toISOString();
    const installed = body.source === 'appinstalled' || body.standalone === true;

    // Does a row already exist for this device?
    const { data: existing } = await A.from('app_installs').select('id, installed_at, user_id').eq('device_id', body.deviceId).maybeSingle();

    const ua = req.headers.get('user-agent')?.slice(0, 400) ?? null;
    if (existing) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const patch: Record<string, any> = {
        last_seen_at: now,
        display_mode: body.standalone ? 'standalone' : 'browser',
        source: body.source,
        platform: body.platform ?? undefined,
      };
      if (user?.id) patch.user_id = user.id; // attach/refresh the signed-in user
      if (installed && !existing.installed_at) patch.installed_at = now;
      await A.from('app_installs').update(patch).eq('id', existing.id);
    } else {
      await A.from('app_installs').insert({
        device_id: body.deviceId,
        user_id: user?.id ?? null,
        platform: body.platform ?? 'other',
        display_mode: body.standalone ? 'standalone' : 'browser',
        source: body.source,
        user_agent: ua,
        installed_at: installed ? now : null,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[pwa track]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
