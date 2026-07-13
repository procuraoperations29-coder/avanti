import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthUser, AuthError } from '@/lib/auth';
import { buildQuote } from '@/lib/pricing/quote';

/**
 * POST /api/customer/quote
 *
 * Returns a price_quote for a given driver + engagement configuration.
 * The quote is written to the DB (immutable), assigned an id, and
 * expires in 10 minutes.
 */

const bodySchema = z.object({
  driverId: z.string().uuid(),
  engagementType: z.enum(['hourly', 'full_day']),
  vehicleClass: z.enum(['sedan', 'suv', 'executive', 'van', 'pickup']),
  startsAt: z.string(), // ISO
  durationHours: z.number().int().min(1).max(24 * 30),
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

    const quote = await buildQuote({
      requestedByUserId: user.id,
      ...body,
    });

    return NextResponse.json(quote);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.code }, { status: err.status });
    }
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[customer/quote]', err);
    // Some error strings from the pricing engine are user-facing
    const userVisible = new Set([
      'driver_not_found',
      'driver_unavailable',
      'driver_not_bookable',
      'driver_class_mismatch',
      'no_rate_card',
      'no_matching_rule',
    ]);
    if (userVisible.has(msg)) {
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    return NextResponse.json({ error: 'quote_failed', message: msg }, { status: 500 });
  }
}
