import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthUser, AuthError } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';

const bodySchema = z.object({
  numberOfDrivers: z.number().int().positive().max(500),
  requirements: z.string().min(10).max(3000),
  preferredStartDate: z.string().nullable().optional(),
});

export async function POST(req: Request) {
  try {
    const user = await requireAuthUser();
    const orgId = user.activeOrganizationId;
    if (!orgId) {
      return NextResponse.json({ error: 'no_organization' }, { status: 400 });
    }
    const isCorp = user.roles.includes('corporate_admin') || user.roles.includes('corporate_member');
    if (!isCorp) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    let body: z.infer<typeof bodySchema>;
    try {
      body = bodySchema.parse(await req.json());
    } catch (err) {
      return NextResponse.json({ error: 'invalid_body', details: String(err) }, { status: 400 });
    }

    const admin = createServiceRoleClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: request, error } = await (admin as any)
      .from('corporate_driver_requests')
      .insert({
        organization_id: orgId,
        requested_by_user_id: user.id,
        number_of_drivers: body.numberOfDrivers,
        requirements: body.requirements,
        preferred_start_date: body.preferredStartDate || null,
        status: 'new',
      })
      .select('id')
      .single();

    if (error || !request) {
      return NextResponse.json(
        { error: 'submit_failed', message: error?.message ?? 'unknown' },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, requestId: request.id });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.code }, { status: err.status });
    }
    console.error('[corporate driver-request]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
