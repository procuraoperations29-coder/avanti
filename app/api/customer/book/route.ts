import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthUser, AuthError } from '@/lib/auth';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { getPricingSettings } from '@/lib/pricing/settings';
import { buildCustomerContractTerms } from '@/lib/contracts/generate';

/**
 * POST /api/customer/book
 *
 * Creates the engagement (status='contract_pending'), generates the engagement
 * contract for the customer to sign, and a pending payment row. Payment is NOT
 * initiated here — the customer signs the contract first, then /sign-and-pay
 * initiates Paystack. Returns { engagementId } so the client can route to the
 * contract page.
 */

const addressSchema = z.object({
  line: z.string().min(3).max(300),
  city: z.string().min(1).max(100).optional(),
  landmark: z.string().max(200).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

const bodySchema = z.object({
  quoteId: z.string().uuid(),
  pickupAddress: addressSchema,
  specialInstructions: z.string().max(2000).optional(),
});

// Shape of quote.inputs jsonb — narrows the Json type for the fields we read
interface QuoteInputs {
  starts_at?: string;
  ends_at?: string;
}

export async function POST(req: Request) {
  try {
    const user = await requireAuthUser();

    let body: z.infer<typeof bodySchema>;
    try {
      body = bodySchema.parse(await req.json());
    } catch (err) {
      return NextResponse.json({ error: 'invalid_body', details: String(err) }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: quote, error: quoteErr } = await supabase
      .from('price_quotes')
      .select('*')
      .eq('id', body.quoteId)
      .single();
    if (quoteErr || !quote) {
      return NextResponse.json({ error: 'quote_not_found' }, { status: 404 });
    }

    if (quote.requested_by_user_id !== user.id) {
      return NextResponse.json({ error: 'quote_belongs_to_another_user' }, { status: 403 });
    }
    if (new Date(quote.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: 'quote_expired' }, { status: 400 });
    }
    if (quote.consumed_at) {
      return NextResponse.json({ error: 'quote_already_used' }, { status: 400 });
    }

    // Narrow the inputs jsonb for the fields we need. Zod could validate
    // this too, but for now a cast is enough since we control the writer.
    const quoteInputs = (quote.inputs ?? {}) as QuoteInputs;

    const admin = createServiceRoleClient();
    const { data: engagement, error: engErr } = await admin
      .from('engagements')
      .insert({
        customer_user_id: user.id,
        driver_id: quote.driver_id!,
        engagement_type: quote.engagement_type,
        status: 'contract_pending',
        starts_at: quoteInputs.starts_at,
        ends_at: quoteInputs.ends_at,
        expected_daily_hours: quote.engagement_type === 'full_day' ? 8 : null,
        timezone: 'Africa/Lagos',
        pickup_address: body.pickupAddress,
        special_instructions: body.specialInstructions ?? null,
        min_verification_tier: quote.min_verification_tier,
        currency: quote.currency,
        customer_price_total: quote.customer_price_total,
        driver_payout_total: quote.driver_payout_total,
        commission_total: quote.commission_total,
        price_quote_id: quote.id,
        requested_at: new Date().toISOString(),
      })
      .select('id')
      .single();
    if (engErr || !engagement) {
      return NextResponse.json(
        { error: 'engagement_create_failed', message: engErr?.message ?? 'unknown' },
        { status: 500 }
      );
    }

    // ── Generate the engagement contract for the customer to sign ──
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const A = admin as any;
    const [{ data: cust }, { data: dp }] = await Promise.all([
      A.from('users').select('full_name').eq('id', user.id).single(),
      A.from('driver_profiles').select('user_id').eq('id', quote.driver_id!).single(),
    ]);
    let driverName = 'your driver';
    if (dp?.user_id) {
      const { data: du } = await A.from('users').select('full_name').eq('id', dp.user_id).single();
      driverName = du?.full_name ?? driverName;
    }
    const settings = await getPricingSettings();
    const reference = `AVANTI-${engagement.id.slice(0, 8)}-${Date.now()}`;
    const terms = buildCustomerContractTerms({
      reference,
      customerName: cust?.full_name ?? 'the Customer',
      driverName,
      engagementType: quote.engagement_type,
      vehicleClass: quote.vehicle_class ?? null,
      startsAt: quoteInputs.starts_at ?? null,
      endsAt: quoteInputs.ends_at ?? null,
      expectedDailyHours: quote.engagement_type === 'full_day' ? 8 : null,
      pickup: body.pickupAddress.line ?? null,
      currency: quote.currency,
      customerPriceTotal: Number(quote.customer_price_total),
      cancelPolicy: { freeHours: settings.cancelFreeHours, nearHours: settings.cancelNearHours, feeNear: settings.cancelFeeNear, feeMid: settings.cancelFeeMid },
      generatedAt: new Date().toISOString(),
    });
    const kind = quote.engagement_type === 'full_day' ? 'engagement_standard' : 'engagement_short';
    const { data: contract, error: cErr } = await A.from('contracts')
      .insert({
        engagement_id: engagement.id,
        kind,
        price_quote_hash: quote.quote_hash,
        jurisdiction: 'NG',
        currency: quote.currency,
        terms,
        status: 'pending_signatures',
      })
      .select('id')
      .single();
    if (cErr || !contract) {
      return NextResponse.json({ error: 'contract_create_failed', message: cErr?.message ?? 'unknown' }, { status: 500 });
    }
    await A.from('engagements').update({ contract_id: contract.id }).eq('id', engagement.id);

    // Pending payment row (Paystack is initiated after signing, in /sign-and-pay).
    const { error: payErr } = await A.from('payments').insert({
      engagement_id: engagement.id,
      payer_user_id: user.id,
      provider: 'paystack',
      provider_ref: reference,
      method_type: 'card',
      currency: quote.currency,
      gross_amount: quote.customer_price_total,
      status: 'pending',
    });
    if (payErr) {
      return NextResponse.json({ error: 'payment_create_failed', message: payErr.message }, { status: 500 });
    }

    return NextResponse.json({ engagementId: engagement.id, contractId: contract.id });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.code }, { status: err.status });
    }
    console.error('[customer/book]', err);
    return NextResponse.json(
      { error: 'book_failed', message: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
