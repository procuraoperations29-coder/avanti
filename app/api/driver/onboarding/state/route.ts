import { NextResponse } from 'next/server';
import { requireAuthUser, AuthError } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { onboardingStateSchema, type OnboardingState } from '@/lib/onboarding/schema';

/**
 * GET  /api/driver/onboarding/state
 *   Returns the current draft state for this driver.
 *
 * PUT  /api/driver/onboarding/state
 *   Merges the request body into onboarding_state. Merge is shallow at
 *   the top level; each sub-section (identity, licence, etc.) replaces
 *   in full to keep semantics clear.
 */

export async function GET() {
  try {
    const user = await requireAuthUser();
    if (!user.roles.includes('driver')) {
      return NextResponse.json({ error: 'not_a_driver' }, { status: 403 });
    }

    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('driver_profiles')
      .select('onboarding_state, verification_status, verification_tier, onboarding_submitted_at')
      .eq('user_id', user.id)
      .single();
    if (error || !data) {
      return NextResponse.json({ error: 'profile_not_found' }, { status: 404 });
    }

    return NextResponse.json({
      state: data.onboarding_state ?? {},
      verificationStatus: data.verification_status,
      verificationTier: data.verification_tier,
      submittedAt: data.onboarding_submitted_at,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.code }, { status: err.status });
    }
    console.error('[onboarding/state GET]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const user = await requireAuthUser();
    if (!user.roles.includes('driver')) {
      return NextResponse.json({ error: 'not_a_driver' }, { status: 403 });
    }

    let patch: OnboardingState;
    try {
      patch = onboardingStateSchema.parse(await req.json());
    } catch (err) {
      return NextResponse.json({ error: 'invalid_body', details: String(err) }, { status: 400 });
    }

    const supabase = await createClient();

    // Fetch existing state
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing } = await (supabase as any)
      .from('driver_profiles')
      .select('onboarding_state, verification_status')
      .eq('user_id', user.id)
      .single();

    // If already submitted or approved, refuse further edits
    const status = existing?.verification_status;
    if (status === 'submitted' || status === 'under_review' || status === 'approved') {
      return NextResponse.json(
        { error: 'already_submitted', status },
        { status: 409 }
      );
    }

    const merged = { ...(existing?.onboarding_state ?? {}), ...patch };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('driver_profiles')
      .update({
        onboarding_state: merged,
        verification_status: 'in_progress',
      })
      .eq('user_id', user.id);
    if (error) {
      return NextResponse.json({ error: 'save_failed', message: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, state: merged });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.code }, { status: err.status });
    }
    console.error('[onboarding/state PUT]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
