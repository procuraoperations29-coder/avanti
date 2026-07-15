import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthUser, AuthError } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { verifyTransaction } from '@/lib/payments/paystack';

const bodySchema = z.object({
  reference: z.string().min(3),
});

export async function POST(req: Request) {
  try {
    await requireAuthUser();

    let body: z.infer<typeof bodySchema>;
    try {
      body = bodySchema.parse(await req.json());
    } catch (err) {
      return NextResponse.json({ error: 'invalid_body', details: String(err) }, { status: 400 });
    }

    const admin = createServiceRoleClient();
    const { data: payment, error: payErr } = await admin
      .from('payments')
      .select('*')
      .eq('provider_ref', body.reference)
      .single();
    if (payErr || !payment) {
      return NextResponse.json({ error: 'payment_not_found' }, { status: 404 });
    }

    if (payment.status === 'captured') {
      return NextResponse.json({ ok: true, status: 'captured', engagementId: payment.engagement_id });
    }

    const verified = await verifyTransaction(body.reference);
    if (verified.status !== 'success') {
      await admin
        .from('payments')
        .update({ status: 'failed', failure_reason: verified.status })
        .eq('id', payment.id);
      return NextResponse.json({ error: 'payment_not_successful', status: verified.status }, { status: 400 });
    }

    const { error: updPayErr } = await admin
      .from('payments')
      .update({
        status: 'captured',
        captured_at: new Date().toISOString(),
        authorized_at: new Date().toISOString(),
      })
      .eq('id', payment.id);
    if (updPayErr) {
      return NextResponse.json(
        { error: 'payment_update_failed', message: updPayErr.message },
        { status: 500 }
      );
    }

    const { error: engErr } = await admin
      .from('engagements')
      .update({
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
      })
      .eq('id', payment.engagement_id!);
    if (engErr) {
      return NextResponse.json(
        { error: 'engagement_confirm_failed', message: engErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      status: 'captured',
      engagementId: payment.engagement_id,
      mock: verified.mock,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.code }, { status: err.status });
    }
    console.error('[paystack/verify]', err);
    return NextResponse.json(
      { error: 'verify_failed', message: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
