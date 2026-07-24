import { NextResponse } from 'next/server';
import { requireAuthUser, AuthError } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * GET /api/driver/engagements
 *
 * Driver-safe columns only. Never returns customer_price_total or
 * commission_total — info isolation invariant.
 */

export async function GET() {
  try {
    const user = await requireAuthUser();
    if (!user.roles.includes('driver')) {
      return NextResponse.json({ error: 'not_a_driver' }, { status: 403 });
    }

    const admin = createServiceRoleClient();

    const { data: profile, error: profErr } = await admin
      .from('driver_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();
    if (profErr || !profile) {
      return NextResponse.json({ error: 'driver_profile_not_found' }, { status: 404 });
    }

    const { data, error } = await admin
      .from('engagements')
      .select(
        'id, engagement_type, status, starts_at, ends_at, expected_daily_hours, timezone, pickup_address, driver_payout_total, currency, activated_at, completed_at, requested_at, confirmed_at, customer_user_id'
      )
      .eq('driver_id', profile.id)
      .in('status', ['confirmed', 'active', 'completed'])
      .order('starts_at', { ascending: false })
      .limit(100);
    if (error) {
      return NextResponse.json({ error: 'list_failed', message: error.message }, { status: 500 });
    }

    const customerIds = Array.from(new Set((data ?? []).map((e) => e.customer_user_id)));

    let customersById: Record<string, { full_name: string; phone: string }> = {};
    if (customerIds.length > 0) {
      const { data: customers } = await admin
        .from('users')
        .select('id, full_name, phone')
        .in('id', customerIds);
      customersById = Object.fromEntries(
        (customers ?? []).map((c) => [
          c.id,
          { full_name: c.full_name ?? 'Customer', phone: c.phone ?? '' },
        ])
      );
    }

    const engagements = (data ?? []).map((e) => {
      const customer = e.customer_user_id ? customersById[e.customer_user_id] : undefined;
      const { customer_user_id: _cust, ...rest } = e;
      return {
        ...rest,
        customer_name: customer?.full_name ?? 'Customer',
        customer_phone: customer?.phone ?? null,
      };
    });

    return NextResponse.json({ engagements });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.code }, { status: err.status });
    }
    console.error('[driver/engagements GET]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
