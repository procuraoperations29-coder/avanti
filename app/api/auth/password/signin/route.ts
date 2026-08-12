import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/auth/password/signin
 *
 * Password sign-in. Establishes an SSR-cookie session. Errors are deliberately
 * generic (no account enumeration). Users without a password should use the
 * email-code fallback instead.
 */
const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(200),
});

const ROLE_HOME: Record<string, string> = {
  driver: '/driver',
  individual_customer: '/customer',
  corporate_admin: '/corporate',
  corporate_member: '/corporate',
  admin_verifier: '/admin',
  admin_support: '/admin',
  admin_finance: '/admin',
  admin_compliance: '/admin',
  super_admin: '/admin',
};

function resolveRedirect(roles: string[], activeRole: string | null): string {
  if (activeRole && ROLE_HOME[activeRole]) return ROLE_HOME[activeRole];
  for (const r of roles) if (ROLE_HOME[r]) return ROLE_HOME[r];
  return '/customer';
}

export async function POST(req: Request) {
  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json({ error: 'invalid_body', details: String(err) }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: body.email,
    password: body.password,
  });

  if (error || !data.user) {
    return NextResponse.json(
      { error: 'invalid_credentials', message: 'Incorrect email or password.' },
      { status: 401 }
    );
  }

  const app = (data.user.app_metadata ?? {}) as Record<string, unknown>;
  const roles = Array.isArray(app.roles) ? (app.roles as string[]) : [];
  const activeRole = typeof app.active_role === 'string' ? app.active_role : null;

  return NextResponse.json({
    userId: data.user.id,
    activeRole,
    needsCompletion: roles.length === 0,
    redirectTo: resolveRedirect(roles, activeRole),
  });
}
