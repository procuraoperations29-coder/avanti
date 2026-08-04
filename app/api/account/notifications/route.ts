import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthUser, AuthError } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * PATCH /api/account/notifications
 *
 * Upserts the user's channel preferences per category. We only store rows the
 * user has explicitly set; a missing row means "use the default" (on). Scoped
 * to the caller's own user_id.
 */
const CATEGORIES = ['bookings', 'payments', 'marketing'] as const;
const CHANNELS = ['email', 'sms'] as const;

const bodySchema = z.object({
  prefs: z
    .array(
      z.object({
        category: z.enum(CATEGORIES),
        channel: z.enum(CHANNELS),
        enabled: z.boolean(),
      })
    )
    .max(20),
});

export async function PATCH(req: Request) {
  try {
    const user = await requireAuthUser();

    let body: z.infer<typeof bodySchema>;
    try {
      body = bodySchema.parse(await req.json());
    } catch (err) {
      return NextResponse.json({ error: 'invalid_body', details: String(err) }, { status: 400 });
    }

    if (body.prefs.length === 0) return NextResponse.json({ ok: true });

    const now = new Date().toISOString();
    const rows = body.prefs.map((p) => ({
      user_id: user.id,
      category: p.category,
      channel: p.channel,
      enabled: p.enabled,
      updated_at: now,
    }));

    const admin = createServiceRoleClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (admin as any)
      .from('notification_preferences')
      .upsert(rows, { onConflict: 'user_id,category,channel' });
    if (error) {
      console.error('[account notifications PATCH]', error);
      return NextResponse.json({ error: 'update_failed', message: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.code }, { status: err.status });
    console.error('[account notifications PATCH]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
