import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthUser, AuthError } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';

const bodySchema = z.object({
  action: z.enum(['activate', 'suspend', 'reactivate', 'close']),
});

function canManageOrgs(roles: string[]): boolean {
  return roles.includes('admin_support') || roles.includes('super_admin');
}

const NEXT_STATUS: Record<string, string> = {
  activate: 'active',
  reactivate: 'active',
  suspend: 'suspended',
  close: 'closed',
};

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuthUser();
    if (!canManageOrgs(user.roles)) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    const { id } = await ctx.params;

    let body: z.infer<typeof bodySchema>;
    try {
      body = bodySchema.parse(await req.json());
    } catch (err) {
      return NextResponse.json({ error: 'invalid_body', details: String(err) }, { status: 400 });
    }

    const admin = createServiceRoleClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (admin as any)
      .from('organizations')
      .update({ status: NEXT_STATUS[body.action], updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      return NextResponse.json({ error: 'update_failed', message: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, status: NEXT_STATUS[body.action] });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.code }, { status: err.status });
    }
    console.error('[admin organizations PATCH]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
