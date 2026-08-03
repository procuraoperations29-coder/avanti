import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthUser, AuthError } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';

const bodySchema = z.object({
  assignmentId: z.string().uuid(),
  action: z.enum(['sign_in', 'sign_out']),
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

    const admin = createServiceRoleClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (admin as any)
      .from('driver_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();
    if (!profile) return NextResponse.json({ error: 'driver_profile_not_found' }, { status: 404 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: assignment } = await (admin as any)
      .from('corporate_assignments')
      .select('id, organization_id, driver_id, status')
      .eq('id', body.assignmentId)
      .single();
    if (!assignment || assignment.driver_id !== profile.id) {
      return NextResponse.json({ error: 'assignment_not_found' }, { status: 404 });
    }
    if (assignment.status !== 'active') {
      return NextResponse.json({ error: 'assignment_not_active' }, { status: 409 });
    }

    const today = new Date().toISOString().slice(0, 10);
    const now = new Date().toISOString();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing } = await (admin as any)
      .from('corporate_attendance')
      .select('id, sign_in_at, sign_out_at')
      .eq('assignment_id', body.assignmentId)
      .eq('work_date', today)
      .maybeSingle();

    if (body.action === 'sign_in') {
      if (existing) {
        if (existing.sign_in_at) return NextResponse.json({ ok: true, already: 'signed_in' });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (admin as any)
          .from('corporate_attendance')
          .update({ sign_in_at: now, status: 'signed_in', updated_at: now })
          .eq('id', existing.id);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (admin as any).from('corporate_attendance').insert({
          assignment_id: body.assignmentId,
          driver_id: profile.id,
          organization_id: assignment.organization_id,
          work_date: today,
          sign_in_at: now,
          status: 'signed_in',
        });
      }
      return NextResponse.json({ ok: true, status: 'signed_in' });
    }

    // sign_out
    if (!existing || !existing.sign_in_at) {
      return NextResponse.json({ error: 'not_signed_in', message: 'Sign in first.' }, { status: 409 });
    }
    if (existing.sign_out_at) return NextResponse.json({ ok: true, already: 'signed_out' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any)
      .from('corporate_attendance')
      .update({ sign_out_at: now, status: 'present', updated_at: now })
      .eq('id', existing.id);
    return NextResponse.json({ ok: true, status: 'present' });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.code }, { status: err.status });
    console.error('[driver corporate attendance]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
