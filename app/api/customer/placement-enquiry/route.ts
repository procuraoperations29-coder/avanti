import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthUser, AuthError } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';

const bodySchema = z.object({
  driverId: z.string().uuid(),
  requirements: z.string().min(20).max(2000),
  preferredStartDate: z.string().nullable().optional(),
  contactMethod: z.enum(['whatsapp', 'phone', 'email']),
  contactDetail: z.string().min(3).max(200),
});

export async function POST(req: Request) {
  try {
    const user = await requireAuthUser();

    let body: z.infer<typeof bodySchema>;
    try {
      body = bodySchema.parse(await req.json());
    } catch (err) {
      return NextResponse.json({ error: 'invalid_body', details: String(err) }, { status: 400 });
    }

    const admin = createServiceRoleClient();

    // Validate driver is real and available for permanent
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: driver, error: driverErr } = await (admin as any)
      .from('driver_profiles')
      .select('id, available_permanent, verification_status, suspended, deleted_at')
      .eq('id', body.driverId)
      .single();

    if (driverErr || !driver) {
      return NextResponse.json({ error: 'driver_not_found' }, { status: 404 });
    }
    if (
      !driver.available_permanent ||
      driver.verification_status !== 'approved' ||
      driver.suspended ||
      driver.deleted_at
    ) {
      return NextResponse.json({ error: 'driver_not_available' }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: enquiry, error: insertErr } = await (admin as any)
      .from('placement_enquiries')
      .insert({
        customer_user_id: user.id,
        driver_id: body.driverId,
        requirements: body.requirements,
        preferred_start_date: body.preferredStartDate || null,
        contact_method: body.contactMethod,
        contact_detail: body.contactDetail,
        status: 'new',
      })
      .select('id')
      .single();

    if (insertErr || !enquiry) {
      return NextResponse.json(
        { error: 'submit_failed', message: insertErr?.message ?? 'unknown' },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, enquiryId: enquiry.id });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.code }, { status: err.status });
    }
    console.error('[placement-enquiry]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
