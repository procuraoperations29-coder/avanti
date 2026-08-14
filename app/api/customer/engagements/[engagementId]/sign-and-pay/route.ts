import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthUser, AuthError } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { initTransaction } from '@/lib/payments/paystack';
import { publicEnv } from '@/config/env';

const bodySchema = z.object({ fullName: z.string().trim().min(3).max(200) });

/**
 * Customer signs the engagement contract (typed full name + today's date) and
 * proceeds to payment. Idempotent: signing again re-initiates payment.
 */
export async function POST(req: Request, ctx: { params: Promise<{ engagementId: string }> }) {
  try {
    const user = await requireAuthUser();
    const { engagementId } = await ctx.params;

    let body: z.infer<typeof bodySchema>;
    try {
      body = bodySchema.parse(await req.json());
    } catch {
      return NextResponse.json({ error: 'name_required', message: 'Type your full name to sign.' }, { status: 400 });
    }

    const admin = createServiceRoleClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const A = admin as any;
    const { data: eng } = await A.from('engagements')
      .select('id, status, customer_user_id, contract_id, currency, customer_price_total')
      .eq('id', engagementId)
      .single();
    if (!eng || eng.customer_user_id !== user.id) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    if (eng.status !== 'contract_pending') {
      return NextResponse.json({ error: 'not_signable', message: 'This booking is no longer awaiting signature.' }, { status: 409 });
    }
    if (!eng.contract_id) return NextResponse.json({ error: 'no_contract' }, { status: 409 });

    const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0]?.trim() || req.headers.get('x-real-ip') || null;
    const ua = req.headers.get('user-agent') ?? null;

    // Record signature (ignore if the customer already signed this contract).
    const { error: sigErr } = await A.from('signatures').insert({
      contract_id: eng.contract_id,
      signatory_id: user.id,
      signatory_role: 'customer',
      signature_ref: body.fullName,
      signature_type: 'typed_name',
      ip_address: ip,
      user_agent: ua,
    });
    if (sigErr && !String(sigErr.message ?? '').toLowerCase().includes('duplicate') && sigErr.code !== '23505') {
      return NextResponse.json({ error: 'sign_failed', message: sigErr.message }, { status: 500 });
    }
    await A.from('contracts').update({ status: 'executed', executed_at: new Date().toISOString() }).eq('id', eng.contract_id);

    // Find the pending payment reference and initiate Paystack.
    const { data: payment } = await A.from('payments')
      .select('id, provider_ref')
      .eq('engagement_id', engagementId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    const reference = payment?.provider_ref ?? `AVANTI-${engagementId.slice(0, 8)}-${Date.now()}`;

    const init = await initTransaction({
      email: user.email || `customer-${user.id}@avanti.local`,
      amountNaira: Number(eng.customer_price_total),
      reference,
      callbackUrl: `${publicEnv.NEXT_PUBLIC_APP_URL}/customer/engagements/${engagementId}`,
      metadata: { engagement_id: engagementId, user_id: user.id, contract_id: eng.contract_id },
    });

    return NextResponse.json({ ok: true, authorizationUrl: init.authorizationUrl, reference: init.reference, mock: init.mock });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.code }, { status: err.status });
    console.error('[sign-and-pay]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
