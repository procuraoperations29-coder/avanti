import { NextResponse } from 'next/server';
import { requireAuthUser, AuthError } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * GET /api/admin/data-requests/[id]/export — compile the subject's personal
 * data for an access/portability request. Returns a downloadable JSON file.
 * Compliance / super only.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuthUser();
    if (!user.roles.includes('admin_compliance') && !user.roles.includes('super_admin')) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    const { id } = await ctx.params;
    const admin = createServiceRoleClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const A = admin as any;

    const { data: dsr } = await A.from('data_subject_requests').select('requester_user_id').eq('id', id).single();
    if (!dsr) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    const uid = dsr.requester_user_id;

    const grab = async (table: string, col: string) => {
      try { const { data } = await A.from(table).select('*').eq(col, uid); return data ?? []; } catch { return []; }
    };

    const [profile] = await grab('users', 'id');
    const dp = await grab('driver_profiles', 'user_id');
    const driverId = dp[0]?.id;
    const driverChild = async (table: string) => (driverId ? (await (async () => { try { const { data } = await A.from(table).select('*').eq('driver_id', driverId); return data ?? []; } catch { return []; } })()) : []);

    const bundle = {
      generated_at: new Date().toISOString(),
      subject_user_id: uid,
      profile: profile ?? null,
      customer_profile: await grab('customer_profiles', 'user_id'),
      driver_profile: dp,
      roles: await grab('user_roles', 'user_id'),
      emergency_contacts: await grab('emergency_contacts', 'user_id'),
      notification_preferences: await grab('notification_preferences', 'user_id'),
      engagements_as_customer: await grab('engagements', 'customer_user_id'),
      trip_requests: await grab('trip_requests', 'customer_user_id'),
      placements: await grab('placements', 'customer_user_id'),
      placement_invoices: await grab('placement_invoices', 'customer_user_id'),
      driver_payout_methods: await driverChild('driver_payout_methods'),
      verification_events: await driverChild('verification_events'),
    };

    return new NextResponse(JSON.stringify(bundle, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="data-export-${uid.slice(0, 8)}.json"`,
      },
    });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.code }, { status: err.status });
    console.error('[data-request export]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
