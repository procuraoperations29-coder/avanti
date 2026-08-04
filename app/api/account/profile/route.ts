import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthUser, AuthError } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * PATCH /api/account/profile
 *
 * The signed-in user edits their own profile. Login identifiers (email, phone)
 * are NOT editable here — they're verified credentials and change through a
 * separate verification flow. Scoped to `id = user.id`, so a user can only ever
 * touch their own row.
 */
const bodySchema = z.object({
  fullName: z.string().trim().min(1, 'Name is required').max(120),
  displayName: z.string().trim().max(80).nullable().optional(),
  preferredLanguage: z.enum(['en', 'fr', 'pt', 'sw']).optional(),
  preferredCurrency: z.enum(['NGN', 'GHS', 'KES', 'ZAR', 'USD', 'EUR', 'GBP']).nullable().optional(),
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

    const admin = createServiceRoleClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const update: Record<string, any> = {
      full_name: body.fullName,
      display_name: body.displayName?.trim() || null,
      updated_at: new Date().toISOString(),
    };
    if (body.preferredLanguage) update.preferred_language = body.preferredLanguage;
    if (body.preferredCurrency !== undefined) update.preferred_currency = body.preferredCurrency;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (admin as any).from('users').update(update).eq('id', user.id);
    if (error) {
      console.error('[account profile PATCH]', error);
      return NextResponse.json({ error: 'update_failed', message: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.code }, { status: err.status });
    console.error('[account profile PATCH]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
