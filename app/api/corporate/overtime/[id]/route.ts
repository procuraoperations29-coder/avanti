import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthUser, AuthError } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';

const bodySchema = z.object({
  action: z.enum(['approve', 'reject']),
  note: z.string().max(500).nullable().optional(),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuthUser();
    // Only the org's admin approves overtime.
    if (!user.roles.includes('corporate_admin')) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    const orgId = user.activeOrganizationId;
    if (!orgId) return NextResponse.json({ error: 'no_organization' }, { status: 400 });

    const { id } = await ctx.params;
    let body: z.infer<typeof bodySchema>;
    try {
      body = bodySchema.parse(await req.json());
    } catch (err) {
      return NextResponse.json({ error: 'invalid_body', details: String(err) }, { status: 400 });
    }

    const admin = createServiceRoleClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: ot } = await (admin as any)
      .from('corporate_overtime')
      .select('id, organization_id, status')
      .eq('id', id)
      .single();
    if (!ot || ot.organization_id !== orgId) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    if (ot.status !== 'pending') {
      return NextResponse.json({ error: 'already_reviewed', status: ot.status }, { status: 409 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (admin as any)
      .from('corporate_overtime')
      .update({
        status: body.action === 'approve' ? 'approved' : 'rejected',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        review_note: body.note ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (error) {
      return NextResponse.json({ error: 'update_failed', message: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, status: body.action === 'approve' ? 'approved' : 'rejected' });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.code }, { status: err.status });
    console.error('[corporate overtime approve]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
