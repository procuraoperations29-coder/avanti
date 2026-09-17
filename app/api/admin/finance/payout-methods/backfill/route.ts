import { NextResponse } from 'next/server';
import { requireAuthUser, AuthError } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * POST /api/admin/finance/payout-methods/backfill
 *
 * Every driver who submitted onboarding before this bug was fixed never
 * got a driver_payout_methods row — the insert used column names that
 * don't exist on the table (bank_name, account_number, is_verified
 * instead of the real account_number_last4 / kyc_status), so it failed
 * silently every time. Drivers can't retrigger it themselves: the
 * review/submit step redirects away the moment onboarding_submitted_at
 * is set, before they can reach the submit button again. This backfills
 * every already-submitted driver who's still missing one, using the
 * payout details they already entered (still sitting in
 * onboarding_state.payout).
 */

function isFinanceAdmin(roles: string[]): boolean {
  return roles.includes('admin_finance') || roles.includes('super_admin');
}

export async function POST() {
  try {
    const user = await requireAuthUser();
    if (!isFinanceAdmin(user.roles)) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const admin = createServiceRoleClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profiles, error: profilesErr } = await (admin as any)
      .from('driver_profiles')
      .select('id, onboarding_state')
      .not('onboarding_submitted_at', 'is', null);

    if (profilesErr) {
      return NextResponse.json({ error: 'list_failed', message: profilesErr.message }, { status: 500 });
    }

    const submittedDrivers: { id: string; onboarding_state: Record<string, Record<string, unknown>> | null }[] =
      profiles ?? [];

    if (submittedDrivers.length === 0) {
      return NextResponse.json({ backfilled: 0, skipped: 0, alreadyHadMethod: 0 });
    }

    const driverIds = submittedDrivers.map((p) => p.id);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingMethods } = await (admin as any)
      .from('driver_payout_methods')
      .select('driver_id')
      .in('driver_id', driverIds)
      .is('deleted_at', null);

    const hasMethod = new Set((existingMethods ?? []).map((m: { driver_id: string }) => m.driver_id));

    let backfilled = 0;
    let skipped = 0;
    let alreadyHadMethod = 0;

    for (const profile of submittedDrivers) {
      if (hasMethod.has(profile.id)) {
        alreadyHadMethod += 1;
        continue;
      }

          const payout = (profile.onboarding_state ?? {}).payout ?? {};
      const bankName = typeof payout.bank_name === 'string' ? payout.bank_name : null;
      const accountNumber = typeof payout.account_number === 'string' ? payout.account_number : '';
      const accountHolderName = typeof payout.account_holder_name === 'string' ? payout.account_holder_name : null;

      if (!bankName || !accountNumber || !accountHolderName) {
        skipped += 1;
        continue;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: insertErr } = await (admin as any).from('driver_payout_methods').insert({
        driver_id: profile.id,
        method_type: 'bank_account',
        bank_code: null,
        account_number_last4: accountNumber.slice(-4) || null,
        account_holder_name: accountHolderName,
        is_default: true,
      });

      if (insertErr) {
        if (!insertErr.message?.toLowerCase().includes('duplicate')) {
          console.error('[payout-methods/backfill]', profile.id, insertErr);
        }
        skipped += 1;
        continue;
      }

      backfilled += 1;
    }

    return NextResponse.json({ backfilled, skipped, alreadyHadMethod });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.code }, { status: err.status });
    }
    console.error('[payout-methods/backfill]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
