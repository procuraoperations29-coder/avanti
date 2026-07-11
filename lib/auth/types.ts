/**
 * Auth context types.
 *
 * `AuthContext` is what every authenticated route handler receives. It's
 * the shape of "who is calling, from where, with what permissions."
 *
 * The claims here mirror the JWT app_metadata (Phase 4 §4.1) — kept flat
 * for ergonomics.
 */

export type UserRole =
  | 'individual_customer'
  | 'driver'
  | 'corporate_admin'
  | 'corporate_member'
  | 'admin_verifier'
  | 'admin_support'
  | 'admin_finance'
  | 'admin_compliance'
  | 'super_admin';

export type VerificationTier = 't0' | 't1' | 't2' | 't3' | 't4';

export type AAL = 'aal1' | 'aal2' | 'aal3';

export interface AuthUser {
  id: string;
  email: string | null;
  phone: string | null;
  roles: UserRole[];
  activeRole: UserRole | null;
  organizationIds: string[];
  activeOrganizationId: string | null;
  verificationTier: VerificationTier | null;
  aal: AAL;
  sensitiveActionAt: number | null; // Unix seconds
  sessionId: string | null;
}

export class AuthError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public metadata: Record<string, unknown> = {}
  ) {
    super(message);
    this.name = 'AuthError';
  }
}
