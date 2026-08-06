import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthUser, AuthError } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * PATCH /api/admin/pricing/cards/[id] — publish or retire a rate card.
 * Finance / super only.
 */
const bodySchema = z.object({ action: z.enum(['publish', 'retire']) });

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuthUser();
    if (!user.roles.includes('admin_finance') && !user.roles.includes('super_admin')) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    const { id } = await ctx.params;
    let body: z.infer<typeof bodySchema>;
    try {
      body = bodySchema.parse(await req.json());
    } catch (err) {
      return NextResponse.json({ error: 'invalid_body', details: String(err) }, { status: 400 });
    }

    const admin = createServiceRoleClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const A = admin as any;
    const now = new Date().toISOString();
    const { data: card } = await A.from('rate_cards').select('id, status, effective_from').eq('id', id).single();
    if (!card) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    const update = body.action === 'publish'
      ? { status: 'published', published_at: now, published_by: user.id, effective_from: card.effective_from ?? now, updated_at: now }
      : { status: 'retired', retired_at: now, retired_by: user.id, updated_at: now };

    const { error } = await A.from('rate_cards').update(update).eq('id', id);
    if (error) return NextResponse.json({ error: 'update_failed', message: error.message }, { status: 500 });

    try {
      await A.from('audit_logs').insert({
        actor_user_id: user.id, actor_role: user.activeRole, entity_type: 'rate_card', entity_id: id,
        action: body.action === 'publish' ? 'publish' : 'retire', metadata: {},
      });
    } catch { /* best-effort */ }

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.code }, { status: err.status });
    console.error('[pricing card PATCH]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
