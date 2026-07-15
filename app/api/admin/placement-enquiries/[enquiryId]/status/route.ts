import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthUser, AuthError } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';

const bodySchema = z.object({
  status: z.enum(['new', 'reviewing', 'introduced', 'matched', 'closed', 'declined']),
});

function isPlacementAdmin(roles: string[]): boolean {
  return (
    roles.includes('admin_support') ||
    roles.includes('admin_verifier') ||
    roles.includes('super_admin')
  );
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ enquiryId: string }> }
) {
  try {
    const user = await requireAuthUser();
    if (!isPlacementAdmin(user.roles)) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const { enquiryId } = await ctx.params;

    let body: z.infer<typeof bodySchema>;
    try {
      body = bodySchema.parse(await req.json());
    } catch (err) {
      return NextResponse.json({ error: 'invalid_body', details: String(err) }, { status: 400 });
    }

    const admin = createServiceRoleClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (admin as any)
      .from('placement_enquiries')
      .update({ status: body.status, updated_at: new Date().toISOString() })
      .eq('id', enquiryId);

    if (error) {
      return NextResponse.json({ error: 'update_failed', message: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.code }, { status: err.status });
    }
    console.error('[placement-enquiry status]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
