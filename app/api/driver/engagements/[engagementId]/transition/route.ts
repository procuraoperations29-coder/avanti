import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthUser, AuthError } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { getTransition, type DriverAction } from '@/lib/engagement/driver-transitions';
import type { Database } from '@/types/database';

const bodySchema = z.object({
  action: z.enum(['activate', 'complete']),
});

// Only the columns we update, all optional except status
type EngagementUpdate = Database['public']['Tables']['engagements']['Update'];

export async function POST(
  req: Request,
  ctx: { params: Promise<{ engagementId: string }> }
) {
  try {
    const user = await requireAuthUser();
    if (!user.roles.includes('driver')) {
      return NextResponse.json({ error: 'not_a_driver' }, { status: 403 });
    }
    const { engagementId } = await ctx.params;

    let body: z.infer<typeof bodySchema>;
    try {
      body = bodySchema.parse(await req.json());
    } catch (err) {
      return NextResponse.json({ error: 'invalid_body', details: String(err) }, { status: 400 });
    }
    const action = body.action as DriverAction;
    const transition = getTransition(action);

    const admin = createServiceRoleClient();

    const { data: profile } = await admin
      .from('driver_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();
    if (!profile) {
      return NextResponse.json({ error: 'driver_profile_not_found' }, { status: 404 });
    }

    const { data: engagement, error: engErr } = await admin
      .from('engagements')
      .select('id, status')
      .eq('id', engagementId)
      .eq('driver_id', profile.id)
      .single();
    if (engErr || !engagement) {
      return NextResponse.json({ error: 'engagement_not_found' }, { status: 404 });
    }

    if (engagement.status !== transition.from) {
      return NextResponse.json(
        {
          error: 'illegal_transition',
          message: `Cannot ${action} from status ${engagement.status}`,
          currentStatus: engagement.status,
        },
        { status: 409 }
      );
    }

    const now = new Date().toISOString();
    const patch: EngagementUpdate = { status: transition.to };
    if (transition.timestampCol === 'activated_at') patch.activated_at = now;
    if (transition.timestampCol === 'completed_at') patch.completed_at = now;

    const { error: updateErr } = await admin
      .from('engagements')
      .update(patch)
      .eq('id', engagementId);
    if (updateErr) {
      return NextResponse.json(
        { error: 'transition_failed', message: updateErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, status: transition.to });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.code }, { status: err.status });
    }
    console.error('[driver/engagements/transition]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
