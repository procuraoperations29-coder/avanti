import { NextResponse } from 'next/server';
import { requireAuthUser, AuthError } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * POST /api/driver/onboarding/submit
 *
 * Called from step-review after the driver clicks "Submit for review".
 *
 * Actions:
 *   1. Validates that all required steps in onboarding_state are populated.
 *   2. Sets driver_profiles.verification_status to 'submitted'.
 *   3. Sets onboarding_submitted_at to now().
 *   4. Creates a driver_payout_methods row (unverified) from the payout data
 *      so admins have a record they can verify during review.
 *
 * After success, the client redirects to /driver/onboarding/step-pending.
 */

export async function POST() {
  try {
    const user = await requireAuthUser();
    if (!user.roles.includes('driver')) {
      return NextResponse.json({ error: 'not_a_driver' }, { status: 403 });
    }

    const admin = createServiceRoleClient();

    // Load current profile + state
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile, error: readErr } = await (admin as any)
      .from('driver_profiles')
      .select('id, onboarding_state, onboarding_submitted_at, availability_preference, verification_status')
      .eq('user_id', user.id)
      .single();

    if (readErr || !profile) {
      return NextResponse.json({ error: 'profile_not_found' }, { status: 404 });
    }

    // Idempotency: if already submitted, return success without changes
    if (profile.onboarding_submitted_at) {
      return NextResponse.json({ submitted: true, alreadySubmitted: true });
    }

    const state = (profile.onboarding_state ?? {}) as Record<string, Record<string, unknown>>;

    // Validate required data present
    const missing: string[] = [];
    const identity = state.identity ?? {};
    const licence = state.licence ?? {};
    const address = state.address ?? {};
    const background = state.background ?? {};
    const experience = state.experience ?? {};
    const payout = state.payout ?? {};

    if (!identity.legal_name || !identity.date_of_birth || !identity.id_type || !identity.id_number) {
      missing.push('identity');
    }
    if (!licence.licence_number || !licence.licence_class || !licence.expiry_date) {
      missing.push('licence');
    }
    if (!address.street_address || !address.city || !address.state) {
      missing.push('address');
    }
    const refs = (background.references as Array<Record<string, unknown>>) ?? [];
    if (refs.length < 2 || background.criminal_record_disclosure === undefined) {
      missing.push('background');
    }
    if (!experience.vehicle_classes || (experience.vehicle_classes as unknown[]).length === 0) {
      missing.push('experience');
    }
    if (!profile.availability_preference) {
      missing.push('availability');
    }
    if (!payout.bank_code || !payout.account_number || !payout.account_holder_name) {
      missing.push('payout');
    }

    if (missing.length > 0) {
      return NextResponse.json(
        { error: 'incomplete', message: `Missing: ${missing.join(', ')}` },
        { status: 400 }
      );
    }

    // Create driver_payout_methods row (unverified)
    // Uses upsert semantics — if a row already exists, don't duplicate
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: payoutMethodErr } = await (admin as any)
      .from('driver_payout_methods')
      .insert({
        driver_id: profile.id,
        method_type: 'bank_account',
        bank_name: payout.bank_name,
        bank_code: payout.bank_code,
        account_number: payout.account_number,
        account_holder_name: payout.account_holder_name,
        is_default: true,
        is_verified: false,
      });

    // If insert fails due to duplicate, that's fine — the driver may be
    // re-submitting after edits. Log any other errors but don't block.
    if (payoutMethodErr && !payoutMethodErr.message?.toLowerCase().includes('duplicate')) {
      console.error('[submit] driver_payout_methods insert:', payoutMethodErr);
      // Don't fail submission — payout method can be added manually by admin
    }

    // Flip verification_status + timestamp
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateErr } = await (admin as any)
      .from('driver_profiles')
      .update({
        verification_status: 'submitted',
        onboarding_submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    if (updateErr) {
      return NextResponse.json(
        { error: 'submit_failed', message: updateErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ submitted: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.code }, { status: err.status });
    }
    console.error('[submit]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
