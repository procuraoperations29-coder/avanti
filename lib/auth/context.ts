import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { AuthError, type AuthUser, type UserRole, type VerificationTier, type AAL } from './types';

/**
 * Read the current user + JWT claims from the request cookies.
 *
 * Returns null for unauthenticated. Throws AuthError only for malformed
 * tokens (which should never happen with a working middleware pipeline).
 */
export async function getAuthUser(): Promise<AuthUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) return null;
  if (!user) return null;

  const app = (user.app_metadata ?? {}) as Record<string, unknown>;

  const roles = Array.isArray(app.roles) ? (app.roles as UserRole[]) : [];
  const organizationIds = Array.isArray(app.organization_ids)
    ? (app.organization_ids as string[])
    : [];

  const activeRole =
    typeof app.active_role === 'string' ? (app.active_role as UserRole) : null;
  const activeOrganizationId =
    typeof app.active_organization_id === 'string' ? app.active_organization_id : null;
  const verificationTier =
    typeof app.verification_tier === 'string'
      ? (app.verification_tier as VerificationTier)
      : null;
  const aal = typeof app.aal === 'string' ? (app.aal as AAL) : 'aal1';
  const sensitiveActionAt =
    typeof app.sensitive_action_at === 'number' ? app.sensitive_action_at : null;
  const sessionId = typeof app.session_id === 'string' ? app.session_id : null;

  return {
    id: user.id,
    email: user.email ?? null,
    phone: user.phone ?? null,
    roles,
    activeRole,
    organizationIds,
    activeOrganizationId,
    verificationTier,
    aal,
    sensitiveActionAt,
    sessionId,
  };
}

/**
 * Same as getAuthUser but throws 401 instead of returning null.
 * Use in code paths that must not run anonymously.
 */
export async function requireAuthUser(): Promise<AuthUser> {
  const user = await getAuthUser();
  if (!user) {
    throw new AuthError(401, 'unauthenticated', 'Sign in required');
  }
  return user;
}
