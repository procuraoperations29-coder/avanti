import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthUser, AuthError } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';

const bodySchema = z.object({
  availableOnDemand: z.boolean(),
  availablePermanent: z.boolean(),
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
      return NextResponse.json({ error: 'invalid_body', details: String(err) }, { status: 400 });
    }

    if (!body.availableOnDemand && !body.availablePermanent) {
      return NextResponse.json(
        { error: 'must_be_available_for_at_least_one' },
        { status: 400 }
      );
    }

    const admin = createServiceRoleClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (admin as any)
      .from('driver_profiles')
      .update({
        available_on_demand: body.availableOnDemand,
        available_permanent: body.availablePermanent,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    if (error) {
      return NextResponse.json({ error: 'update_failed', message: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.code }, { status: err.status });
    }
    console.error('[driver/availability]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
