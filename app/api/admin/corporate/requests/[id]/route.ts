import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthUser, AuthError } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { raiseCorporateUpfrontInvoice } from '@/lib/corporate/billing';

const bodySchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('review') }),
  z.object({ action: z.literal('decline') }),
  z.object({ action: z.literal('fulfill') }),
  z.object({ action: z.literal('close') }),
  z.object({ action: z.literal('raise_upfront') }),
  z.object({
    action: z.literal('assign'),
    driverId: z.string().uuid(),
    monthlyRate: z.number().positive().max(100_000_000),
    driverMonthlyPay: z.number().min(0).max(100_000_000),
    overtimeHourlyRate: z.number().min(0).max(1_000_000).optional().default(0),
    positionTitle: z.string().max(120).nullable().optional(),
    startDate: z.string().min(1),
  }),
]);

function isCorpAdmin(roles: string[]): boolean {
  return (
    roles.includes('admin_support') ||
    roles.includes('admin_verifier') ||
    roles.includes('admin_finance') ||
    roles.includes('super_admin')
  );
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuthUser();
    if (!isCorpAdmin(user.roles)) {
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
    const { data: request, error: fetchErr } = await (admin as any)
      .from('corporate_driver_requests')
      .select('id, organization_id, status')
      .eq('id', id)
      .single();
    if (fetchErr || !request) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    // Raise ONE aggregate upfront invoice for the org's pending, not-yet-invoiced
    // drivers — a single link + email, not one per driver.
    if (body.action === 'raise_upfront') {
      const result = await raiseCorporateUpfrontInvoice(admin, request.organization_id);
      if (!result.ok) {
        const msg =
          result.reason === 'already_invoiced'
            ? 'All pending drivers are already on an upfront invoice.'
            : result.reason === 'no_pending_assignments'
              ? 'No pending drivers to invoice — assign drivers first.'
              : 'Could not raise the invoice.';
        return NextResponse.json({ error: result.reason ?? 'failed', message: msg }, { status: 400 });
      }
      return NextResponse.json({ ok: true, drivers: result.drivers });
    }

    if (body.action !== 'assign') {
      const status =
        body.action === 'review' ? 'reviewing' : body.action === 'decline' ? 'declined' : body.action === 'fulfill' ? 'fulfilled' : 'closed';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (admin as any)
        .from('corporate_driver_requests')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) return NextResponse.json({ error: 'update_failed', message: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, status });
    }

    // Assign a driver to this request's org. Starts 'pending' — the 70%
    // upfront invoice (below) activates it on payment.
    if (body.driverMonthlyPay > body.monthlyRate) {
      return NextResponse.json({ error: 'pay_exceeds_rate' }, { status: 400 });
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: assignment, error: asgErr } = await (admin as any)
      .from('corporate_assignments')
      .insert({
        organization_id: request.organization_id,
        driver_id: body.driverId,
        request_id: id,
        monthly_rate: body.monthlyRate,
        driver_monthly_pay: body.driverMonthlyPay,
        overtime_hourly_rate: body.overtimeHourlyRate ?? 0,
        position_title: body.positionTitle ?? null,
        start_date: body.startDate,
        status: 'pending',
      })
      .select('id')
      .single();
    if (asgErr || !assignment) {
      return NextResponse.json({ error: 'assign_failed', message: asgErr?.message ?? 'unknown' }, { status: 500 });
    }

    // No per-driver invoice here — ops raises ONE aggregate upfront invoice for
    // all assigned drivers via the 'raise_upfront' action.

    // Move the request forward (unless it's already been finalised).
    if (!['fulfilled', 'closed'].includes(request.status)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (admin as any)
        .from('corporate_driver_requests')
        .update({ status: 'partially_fulfilled', updated_at: new Date().toISOString() })
        .eq('id', id);
    }

    return NextResponse.json({ ok: true, assignmentId: assignment.id });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.code }, { status: err.status });
    }
    console.error('[admin corporate requests PATCH]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
