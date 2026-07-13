import { NextResponse } from 'next/server';
import { requireAuthUser, AuthError } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * GET /api/driver/engagements
 *
 * Returns this driver's engagements with driver-safe columns only.
 * Never returns customer_price_total or commission_total — info
 * isolation invariant (Phase 3 D26).
 *
 * Uses service-role client because we need to join engagements with
 * users to fetch customer names, and standard RLS would block that
 * cross-role read. The query is guarded by driver_id = this driver's
 * driver_profiles.id.
 */

export async function GET() {
  try {
    const user = await requireAuthUser();
    if (!user.roles.includes('driver')) {
      return NextResponse.json({ error: 'not_a_driver' }, { status: 403 });
    }

    const admin = createServiceRoleClient();

    // Fetch this user's driver_profiles.id
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile, error: profErr } = await (admin as any)
      .from('driver_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();
    if (profErr || !profile) {
      return NextResponse.json({ error: 'driver_profile_not_found' }, { status: 404 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (admin as any)
      .from('engagements')
      .select(
        'id, engagement_type, status, starts_at, ends_at, expected_daily_hours, timezone, pickup_address, driver_payout_total, currency, activated_at, completed_at, requested_at, confirmed_at, customer_user_id'
      )
      .eq('driver_id', profile.id)
      .in('status', ['confirmed', 'activated', 'in_progress', 'completed'])
      .order('starts_at', { ascending: false })
      .limit(100);
    if (error) {
      return NextResponse.json({ error: 'list_failed', message: error.message }, { status: 500 });
    }

    // Look up customer names in one batch
    const customerIds = Array.from(
      new Set((data ?? []).map((e: { customer_user_id: string }) => e.customer_user_id))
    );
    let customersById: Record<string, { full_name: string; phone: string }> = {};
    if (customerIds.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: customers } = await (admin as any)
        .from('users')
        .select('id, full_name, phone')
        .in('id', customerIds);
      customersById = Object.fromEntries(
        (customers ?? []).map((c: { id: string; full_name: string; phone: string }) => [
          c.id,
          { full_name: c.full_name, phone: c.phone },
        ])
      );
    }

    const engagements = (data ?? []).map(
      (e: { customer_user_id: string } & Record<string, unknown>) => {
        const customer = customersById[e.customer_user_id];
        // Strip customer_user_id from the response (driver doesn't need
        // it exposed); replace with just the display name + phone.
        const { customer_user_id: _cust, ...rest } = e;
        return {
          ...rest,
          customer_name: customer?.full_name ?? 'Customer',
          customer_phone: customer?.phone ?? null,
        };
      }
    );

    return NextResponse.json({ engagements });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.code }, { status: err.status });
    }
    console.error('[driver/engagements GET]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
