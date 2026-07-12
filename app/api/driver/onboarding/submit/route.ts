import { NextResponse } from 'next/server';
import { requireAuthUser, AuthError } from '@/lib/auth';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { submitReadinessSchema } from '@/lib/onboarding/schema';

/**
 * POST /api/driver/onboarding/submit
 *
 * Validates the driver has completed every required step, writes the
 * captured details onto driver_profiles + driver_payout_methods,
 * inserts a verification_events row with event_type='submitted', and
 * flips verification_status to 'submitted'.
 *
 * The submit trigger from Slice 2 (fn_apply_verification_event) then
 * updates the driver_profiles.verification_status accordingly. Tier
 * derivation happens at admin approval time.
 */

export async function POST() {
  try {
    const user = await requireAuthUser();
    if (!user.roles.includes('driver')) {
      return NextResponse.json({ error: 'not_a_driver' }, { status: 403 });
    }

    const supabase = await createClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile, error: fetchErr } = await (supabase as any)
      .from('driver_profiles')
      .select('id, onboarding_state, verification_status')
      .eq('user_id', user.id)
      .single();
    if (fetchErr || !profile) {
      return NextResponse.json({ error: 'profile_not_found' }, { status: 404 });
    }

    if (profile.verification_status === 'submitted' || profile.verification_status === 'under_review') {
      return NextResponse.json({ ok: true, alreadySubmitted: true, status: profile.verification_status });
    }

    const state = profile.onboarding_state ?? {};

    // Validate submission readiness
    const check = submitReadinessSchema.safeParse(state);
    if (!check.success) {
      return NextResponse.json(
        {
          error: 'incomplete',
          message: 'Some steps are incomplete',
          details: check.error.flatten(),
        },
        { status: 400 }
      );
    }

    const submission = check.data;
    const admin = createServiceRoleClient();

    // Persist profile fields captured during the wizard
    const experience = state.experience ?? {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: profErr } = await (admin as any)
      .from('driver_profiles')
      .update({
        years_experience: submission.experience.yearsExperience,
        languages: submission.experience.languages,
        vehicle_class_experience: submission.experience.vehicleClasses,
        transmission_experience: submission.experience.transmissionTypes,
        bio: experience.bio ?? null,
        service_radius_km: experience.serviceRadiusKm ?? null,
        verification_status: 'submitted',
        onboarding_submitted_at: new Date().toISOString(),
      })
      .eq('id', profile.id);
    if (profErr) {
      return NextResponse.json(
        { error: 'profile_update_failed', message: profErr.message },
        { status: 500 }
      );
    }

    // Insert payout method
    const payout = submission.payout;
    const payoutRow =
      payout.accountKind === 'bank_transfer'
        ? {
            driver_id: profile.id,
            kind: 'bank_transfer',
            display_name: `${payout.bankName} • ****${payout.accountNumber.slice(-4)}`,
            details: {
              bank_name: payout.bankName,
              account_number: payout.accountNumber,
              account_name: payout.accountName,
            },
            is_default: true,
            verified: false,
          }
        : {
            driver_id: profile.id,
            kind: 'mobile_money',
            display_name: `${payout.mobileMoneyProvider} • ****${payout.msisdn.slice(-4)}`,
            details: {
              provider: payout.mobileMoneyProvider,
              msisdn: payout.msisdn,
            },
            is_default: true,
            verified: false,
          };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: payoutErr } = await (admin as any)
      .from('driver_payout_methods')
      .insert(payoutRow);
    if (payoutErr) {
      console.error('[submit] payout method insert failed', payoutErr);
      // Don't hard-fail — driver can retry adding a method later
    }

    // Record the submission as a verification_event.
    // The trigger from Slice 2 flips verification_status to 'submitted'.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: eventErr } = await (admin as any).from('verification_events').insert({
      driver_id: profile.id,
      event_type: 'submitted',
      actor_user_id: user.id,
      document_ids: [
        submission.identity.idFrontDocumentId,
        submission.identity.selfieDocumentId,
        submission.licence.licenceFrontDocumentId,
        submission.address.addressProofDocumentId,
        ...(state.identity?.idBackDocumentId ? [state.identity.idBackDocumentId] : []),
        ...(state.licence?.licenceBackDocumentId ? [state.licence.licenceBackDocumentId] : []),
      ],
    });
    if (eventErr) {
      return NextResponse.json(
        { error: 'event_insert_failed', message: eventErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, status: 'submitted' });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.code }, { status: err.status });
    }
    console.error('[onboarding/submit]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
