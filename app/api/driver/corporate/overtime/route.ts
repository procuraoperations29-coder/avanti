import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthUser, AuthError } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';

const bodySchema = z.object({
  assignmentId: z.string().uuid(),
  workDate: z.string().min(1),
  hours: z.number().positive().max(24),
  note: z.string().max(500).nullable().optional(),
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: overtime, error } = await (admin as any)
      .from('corporate_overtime')
      .insert({
        assignment_id: body.assignmentId,
        driver_id: profile.id,
        organization_id: assignment.organization_id,
        work_date: body.workDate,
        hours: body.hours,
        note: body.note ?? null,
        status: 'pending',
      })
      .select('id')
      .single();
    if (error || !overtime) {
      return NextResponse.json({ error: 'log_failed', message: error?.message ?? 'unknown' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, overtimeId: overtime.id });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.code }, { status: err.status });
    console.error('[driver corporate overtime]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
