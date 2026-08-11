import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthUser, AuthError } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { canManageCarHire } from '../route';

const bodySchema = z.object({
  name: z.string().min(2).max(200).optional(),
  legal_name: z.string().max(200).nullable().optional(),
  contact_name: z.string().max(200).nullable().optional(),
  contact_phone: z.string().max(40).nullable().optional(),
  contact_email: z.string().max(200).nullable().optional(),
  city: z.string().max(120).nullable().optional(),
  bank_name: z.string().max(120).nullable().optional(),
  bank_code: z.string().max(40).nullable().optional(),
  account_number_last4: z.string().max(4).nullable().optional(),
  account_holder_name: z.string().max(200).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  status: z.enum(['active', 'suspended', 'closed']).optional(),
  deleted: z.literal(true).optional(),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuthUser();
    if (!canManageCarHire(user.roles)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    const { id } = await ctx.params;

    let body: z.infer<typeof bodySchema>;
    try {
      body = bodySchema.parse(await req.json());
    } catch (err) {
      return NextResponse.json({ error: 'invalid_body', details: String(err) }, { status: 400 });
    }

    const admin = createServiceRoleClient();
    const now = new Date().toISOString();
    const { deleted, ...fields } = body;
    const update: Record<string, unknown> = { ...fields, updated_at: now };
    if (deleted) update.deleted_at = now;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (admin as any).from('leasing_partners').update(update).eq('id', id);
    if (error) return NextResponse.json({ error: 'update_failed', message: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.code }, { status: err.status });
    console.error('[car-hire partners PATCH]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
