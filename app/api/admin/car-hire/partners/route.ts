import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthUser, AuthError } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';

/** Car-hire admin: finance / support / super manage leasing partners. */
export function canManageCarHire(roles: string[]): boolean {
  return roles.includes('admin_finance') || roles.includes('admin_support') || roles.includes('super_admin');
}

const bodySchema = z.object({
  name: z.string().min(2).max(200),
  legal_name: z.string().max(200).optional().nullable(),
  contact_name: z.string().max(200).optional().nullable(),
  contact_phone: z.string().max(40).optional().nullable(),
  contact_email: z.string().email().max(200).optional().nullable().or(z.literal('')),
  city: z.string().max(120).optional().nullable(),
  bank_name: z.string().max(120).optional().nullable(),
  bank_code: z.string().max(40).optional().nullable(),
  account_number_last4: z.string().max(4).optional().nullable(),
  account_holder_name: z.string().max(200).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export async function POST(req: Request) {
  try {
    const user = await requireAuthUser();
    if (!canManageCarHire(user.roles)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

    let body: z.infer<typeof bodySchema>;
    try {
      body = bodySchema.parse(await req.json());
    } catch (err) {
      return NextResponse.json({ error: 'invalid_body', details: String(err) }, { status: 400 });
    }

    const admin = createServiceRoleClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (admin as any)
      .from('leasing_partners')
      .insert({
        name: body.name,
        legal_name: body.legal_name || null,
        contact_name: body.contact_name || null,
        contact_phone: body.contact_phone || null,
        contact_email: body.contact_email || null,
        city: body.city || null,
        bank_name: body.bank_name || null,
        bank_code: body.bank_code || null,
        account_number_last4: body.account_number_last4 || null,
        account_holder_name: body.account_holder_name || null,
        notes: body.notes || null,
        created_by: user.id,
      })
      .select('id')
      .single();
    if (error) return NextResponse.json({ error: 'create_failed', message: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, id: data.id });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.code }, { status: err.status });
    console.error('[car-hire partners POST]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
