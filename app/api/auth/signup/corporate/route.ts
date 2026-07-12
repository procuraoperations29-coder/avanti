import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthUser, AuthError } from '@/lib/auth';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';

/**
 * POST /api/auth/signup/corporate
 *
 * Completes corporate signup. Creates the organization row (status=pending_verification),
 * sets the current user as primary_admin, and grants corporate_admin role scoped to
 * that org.
 *
 * Organization verification (business registration, tax ID) is an admin-side
 * workflow before the org can transact.
 */

const bodySchema = z.object({
  fullName: z.string().min(1).max(200).optional(),
  companyName: z.string().min(1).max(200),
  legalName: z.string().min(1).max(200).optional(),
  registrationNumber: z.string().max(100).optional(),
  sector: z.string().max(100).optional(),
  billingEmail: z.string().email(),
  countryCode: z.string().length(2).default('NG'),
  defaultCurrency: z.enum(['NGN', 'GHS', 'KES', 'ZAR', 'USD', 'EUR', 'GBP']).default('NGN'),
});

export async function POST(req: Request) {
  try {
    const user = await requireAuthUser();

    let body: z.infer<typeof bodySchema>;
    try {
      body = bodySchema.parse(await req.json());
    } catch (err) {
      return NextResponse.json(
        { error: 'invalid_body', details: err instanceof z.ZodError ? err.errors : String(err) },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const admin = createServiceRoleClient();

    if (body.fullName) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await supabase.from('users').update({ full_name: body.fullName } as any).eq('id', user.id);
      if (error) console.error('[signup/corporate] users update failed', error);
    }

    // Create the organization
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: org, error: orgErr } = await (admin as any)
      .from('organizations')
      .insert({
        name: body.companyName,
        legal_name: body.legalName ?? body.companyName,
        registration_number: body.registrationNumber ?? null,
        sector: body.sector ?? null,
        country_code: body.countryCode,
        default_currency: body.defaultCurrency,
        billing_email: body.billingEmail,
        billing_address: {}, // filled in later during verification
        primary_admin_id: user.id,
        status: 'pending_verification',
      })
      .select('id')
      .single();

    if (orgErr || !org) {
      console.error('[signup/corporate] organization insert failed', orgErr);
      return NextResponse.json(
        { error: 'org_create_failed', message: orgErr?.message ?? 'unknown' },
        { status: 500 }
      );
    }

    // Grant corporate_admin role scoped to this org
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: roleErr } = await (admin as any).from('user_roles').insert({
      user_id: user.id,
      role: 'corporate_admin',
      organization_id: org.id,
    });
    if (roleErr) {
      console.error('[signup/corporate] user_roles insert failed', roleErr);
      return NextResponse.json(
        { error: 'role_assign_failed', message: roleErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, organizationId: org.id });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.code, message: err.message }, { status: err.status });
    }
    console.error('[signup/corporate] unexpected', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
