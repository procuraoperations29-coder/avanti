import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthUser, AuthError } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';

/** POST /api/push/unsubscribe — revoke a subscription for the signed-in user. */
const bodySchema = z.object({ endpoint: z.string().url() });

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any)
      .from('push_subscriptions')
      .update({ revoked_at: new Date().toISOString() })
      .eq('endpoint', body.endpoint)
      .eq('user_id', user.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.code }, { status: err.status });
    console.error('[push unsubscribe]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
