import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthUser, AuthError } from '@/lib/auth';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { initTransaction } from '@/lib/payments/paystack';
import { publicEnv } from '@/config/env';

/**
 * POST /api/customer/book
 *
 * Body: { quoteId, pickupAddress, specialInstructions? }
 *
 * Creates the engagement (status='draft') and payment (status='pending'),
 * then initiates a Paystack transaction. Returns the authorization URL
 * the client should redirect to.
 *
 * When Paystack is unconfigured (dev), initTransaction returns a mock
 * URL that points back to the engagement detail page with search params
 * that the client-side PaymentCallbackHandler picks up.
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

export async function POST(req: Request) {
  try {
    const user = await requireAuthUser();

    let body: z.infer<typeof bodySchema>;
    try {
      body = bodySchema.parse(await req.json());
    } catch (err) {
      return NextResponse.json({ error: 'invalid_body', details: String(err) }, { status: 400 });
    }

    // Read the price quote to establish the engagement's numbers
    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: quote, error: quoteErr } = await (supabase as any)
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
    if (new Date(quote.expires_at) < new Date()) {
      return NextResponse.json({ error: 'quote_expired' }, { status: 400 });
    }
    if (quote.consumed_at) {
      return NextResponse.json({ error: 'quote_already_used' }, { status: 400 });
    }

    // Create the engagement (status = 'draft').
    const admin = createServiceRoleClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: engagement, error: engErr } = await (admin as any)
      .from('engagements')
      .insert({
        customer_user_id: user.id,
        driver_id: quote.driver_id,
        engagement_type: quote.engagement_type,
        status: 'draft',
        starts_at: quote.inputs?.starts_at,
        ends_at: quote.inputs?.ends_at,
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

    // Create the payment record
    const reference = `AVANTI-${engagement.id.slice(0, 8)}-${Date.now()}`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: payment, error: payErr } = await (admin as any)
      .from('payments')
      .insert({
        engagement_id: engagement.id,
        payer_user_id: user.id,
        provider: 'paystack',
        provider_ref: reference,
        method_type: 'card',
        currency: quote.currency,
        gross_amount: quote.customer_price_total,
        status: 'pending',
      })
      .select('id')
      .single();
    if (payErr || !payment) {
      return NextResponse.json(
        { error: 'payment_create_failed', message: payErr?.message ?? 'unknown' },
        { status: 500 }
      );
    }

    // Callback URL points at the engagement detail page directly.
    // The page reads ?reference=... on mount and calls the verify API.
    const callbackUrl = `${publicEnv.NEXT_PUBLIC_APP_URL}/customer/engagements/${engagement.id}`;
    const init = await initTransaction({
      email: user.email || `customer-${user.id}@avanti.local`,
      amountNaira: quote.customer_price_total,
      reference,
      callbackUrl,
      metadata: {
        engagement_id: engagement.id,
        payment_id: payment.id,
        user_id: user.id,
      },
    });

    return NextResponse.json({
      engagementId: engagement.id,
      paymentId: payment.id,
      authorizationUrl: init.authorizationUrl,
      reference: init.reference,
      mock: init.mock,
    });
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