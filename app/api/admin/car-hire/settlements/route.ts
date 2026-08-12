import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthUser, AuthError } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { canManageCarHire } from '../partners/route';

const bodySchema = z.object({
  kind: z.enum(['partner', 'driver']),
  bookingIds: z.array(z.string().uuid()).min(1).max(500),
  reference: z.string().max(200).optional().nullable(),
});

/**
 * PATCH /api/admin/car-hire/settlements — mark the partner or driver payable on
 * the given (already customer-paid) bookings as settled out-of-band.
 */
export async function PATCH(req: Request) {
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
    const now = new Date().toISOString();
    const update =
      body.kind === 'partner'
        ? { partner_settlement_status: 'settled', partner_settled_at: now, partner_settlement_ref: body.reference ?? null, updated_at: now }
        : { driver_settlement_status: 'settled', driver_settled_at: now, driver_settlement_ref: body.reference ?? null, updated_at: now };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (admin as any)
      .from('car_hire_bookings')
      .update(update)
      .in('id', body.bookingIds)
      .in('payment_status', ['paid', 'manual_paid']);
    if (error) return NextResponse.json({ error: 'update_failed', message: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, count: body.bookingIds.length });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.code }, { status: err.status });
    console.error('[car-hire settlements PATCH]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
