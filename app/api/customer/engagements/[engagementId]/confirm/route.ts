import { NextResponse } from 'next/server';
import { requireAuthUser, AuthError } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { notifyEngagementEvent } from '@/lib/email/engagement-notify';

/**
 * Customer confirms an engagement is complete. Only valid once the driver has
 * marked it 'completed'. Records customer_confirmed_at (idempotent) and pings
 * Avanti ops so we know the job is genuinely done.
 */
export async function POST(req: Request, ctx: { params: Promise<{ engagementId: string }> }) {
  try {
    const user = await requireAuthUser();
    const { engagementId } = await ctx.params;

    const admin = createServiceRoleClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: eng } = await (admin as any)
      .from('engagements')
      .select('id, status, customer_user_id, customer_confirmed_at')
      .eq('id', engagementId)
      .single();

    if (!eng || eng.customer_user_id !== user.id) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    if (eng.status !== 'completed') {
      return NextResponse.json(
        { error: 'not_completed', message: 'This engagement is not marked complete yet.' },
        { status: 409 }
      );
    }
    if (eng.customer_confirmed_at) {
      return NextResponse.json({ ok: true, already: true });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updErr } = await (admin as any)
      .from('engagements')
      .update({ customer_confirmed_at: new Date().toISOString() })
      .eq('id', engagementId);
    if (updErr) {
      return NextResponse.json({ error: 'update_failed', message: updErr.message }, { status: 500 });
    }

    await notifyEngagementEvent(admin, engagementId, 'customer_confirmed');

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.code }, { status: err.status });
    }
    console.error('[customer confirm]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
