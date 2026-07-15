import { NextResponse } from 'next/server';
import { requireAuthUser, AuthError } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ engagementId: string }> }
) {
  try {
    const user = await requireAuthUser();
    if (!user.roles.includes('driver')) {
      return NextResponse.json({ error: 'not_a_driver' }, { status: 403 });
    }
    const { engagementId } = await ctx.params;

    const admin = createServiceRoleClient();

    const { data: profile } = await admin
      .from('driver_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();
    if (!profile) {
      return NextResponse.json({ error: 'driver_profile_not_found' }, { status: 404 });
    }

    const { data: engagement, error } = await admin
      .from('engagements')
      .select(
        'id, engagement_type, status, starts_at, ends_at, expected_daily_hours, timezone, pickup_address, special_instructions, driver_payout_total, currency, activated_at, completed_at, requested_at, confirmed_at, customer_user_id'
      )
      .eq('id', engagementId)
      .eq('driver_id', profile.id)
      .single();
    if (error || !engagement) {
      return NextResponse.json({ error: 'engagement_not_found' }, { status: 404 });
    }

    const { data: customer } = await admin
      .from('users')
      .select('full_name, phone')
      .eq('id', engagement.customer_user_id)
      .single();

    const { customer_user_id: _cust, ...rest } = engagement;
    return NextResponse.json({
      engagement: {
        ...rest,
        customer_name: customer?.full_name ?? 'Customer',
        customer_phone: customer?.phone ?? null,
      },
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.code }, { status: err.status });
    }
    console.error('[driver/engagements GET]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
