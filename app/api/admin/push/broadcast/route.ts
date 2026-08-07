import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthUser, AuthError } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { sendPushToAll, sendPushToUser } from '@/lib/push/send';

/**
 * POST /api/admin/push/broadcast — send a push to all subscribers, or a test to
 * yourself. Support / super only.
 */
const bodySchema = z.object({
  title: z.string().min(1).max(80),
  body: z.string().min(1).max(300),
  url: z.string().max(500).optional(),
  target: z.enum(['all', 'test']).default('test'),
});

export async function POST(req: Request) {
  try {
    const user = await requireAuthUser();
    if (!user.roles.includes('admin_support') && !user.roles.includes('super_admin')) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    let body: z.infer<typeof bodySchema>;
    try {
      body = bodySchema.parse(await req.json());
    } catch {
      return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
    }

    const admin = createServiceRoleClient();
    const payload = { title: body.title, body: body.body, url: body.url || '/' };
    const result = body.target === 'all'
      ? await sendPushToAll(admin, payload)
      : await sendPushToUser(admin, user.id, payload);

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (admin as any).from('audit_logs').insert({
        actor_user_id: user.id, actor_role: user.activeRole, entity_type: 'push_broadcast', entity_id: null,
        action: 'create', metadata: { target: body.target, title: body.title, ...result },
      });
    } catch { /* best-effort */ }

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.code }, { status: err.status });
    console.error('[push broadcast]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
