import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthUser, AuthError } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { notifyCorporateInvoicePaid } from '@/lib/corporate/billing';

const bodySchema = z.object({ action: z.enum(['mark_paid']) });

function canPay(roles: string[]): boolean {
  return roles.includes('admin_finance') || roles.includes('admin_support') || roles.includes('super_admin');
}

/**
 * Manually mark a corporate invoice paid (bank transfer). Mirrors the Paystack
 * webhook: an upfront invoice activates all the drivers it covers.
 */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuthUser();
    if (!canPay(user.roles)) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    const { id } = await ctx.params;
    try {
      bodySchema.parse(await req.json());
    } catch (err) {
      return NextResponse.json({ error: 'invalid_body', details: String(err) }, { status: 400 });
    }

    const admin = createServiceRoleClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: inv } = await (admin as any)
      .from('corporate_invoices')
      .select('id, organization_id, kind, amount, assignment_ids, payment_status')
      .eq('id', id)
      .single();
    if (!inv) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    if (inv.payment_status === 'paid' || inv.payment_status === 'manual_paid') {
      return NextResponse.json({ ok: true, already: true });
    }

    const nowIso = new Date().toISOString();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any)
      .from('corporate_invoices')
      .update({ status: 'paid', payment_status: 'manual_paid', paid_at: nowIso, updated_at: nowIso })
      .eq('id', id);

    if (inv.kind === 'upfront' && (inv.assignment_ids?.length ?? 0) > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (admin as any)
        .from('corporate_assignments')
        .update({ status: 'active', activated_at: nowIso, updated_at: nowIso })
        .in('id', inv.assignment_ids)
        .eq('status', 'pending');
    }

    await notifyCorporateInvoicePaid(admin, inv);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.code }, { status: err.status });
    console.error('[admin corporate invoice mark_paid]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
