import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthUser, AuthError } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { ONBOARDING_STEPS, type OnboardingStep } from '@/lib/onboarding/state';

/**
 * POST /api/driver/onboarding/save-step
 *
 * Body: { step: 'identity' | 'licence' | ..., data: {...} }
 *
 * Merges the given data into the driver's onboarding_state jsonb.
 * Steps can partial-save — the wizard doesn't require you to complete
 * a step before moving on (though the UI enforces required fields).
 */

const stepEnum = z.enum(ONBOARDING_STEPS);

const bodySchema = z.object({
  step: stepEnum,
  data: z.record(z.string(), z.any()),
});

export async function POST(req: Request) {
  try {
    const user = await requireAuthUser();
    if (!user.roles.includes('driver')) {
      return NextResponse.json({ error: 'not_a_driver' }, { status: 403 });
    }

    let body: z.infer<typeof bodySchema>;
    try {
      body = bodySchema.parse(await req.json());
    } catch (err) {
      return NextResponse.json(
        { error: 'invalid_body', details: err instanceof z.ZodError ? err.errors : String(err) },
        { status: 400 }
      );
    }

    const admin = createServiceRoleClient();

    // Load current state
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile, error: readErr } = await (admin as any)
      .from('driver_profiles')
      .select('onboarding_state')
      .eq('user_id', user.id)
      .single();

    if (readErr || !profile) {
      return NextResponse.json({ error: 'profile_not_found' }, { status: 404 });
    }

    const currentState = (profile.onboarding_state ?? {}) as Record<string, unknown>;
    const currentStepData = (currentState[body.step] ?? {}) as Record<string, unknown>;

    // Merge new data over old (deep-merge at the step level, not deeper)
    const nextState = {
      ...currentState,
      [body.step]: {
        ...currentStepData,
        ...body.data,
      },
      last_step_completed: body.step,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateErr } = await (admin as any)
      .from('driver_profiles')
      .update({ onboarding_state: nextState, updated_at: new Date().toISOString() })
      .eq('user_id', user.id);

    if (updateErr) {
      return NextResponse.json(
        { error: 'save_failed', message: updateErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ saved: true, step: body.step as OnboardingStep });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.code }, { status: err.status });
    }
    console.error('[save-step]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
