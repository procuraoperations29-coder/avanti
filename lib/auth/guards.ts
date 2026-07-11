import 'server-only';
import { AuthError, type AAL } from './types';
import { getAuthUser, requireAuthUser } from './context';
import { hasPermission, type Permission } from './permissions';
import type { AuthUser, VerificationTier } from './types';

/**
 * Composable auth guards for route handlers and server actions.
 * Phase 4 §12 pattern.
 *
 * Usage:
 *   export const POST = withAuth(
 *     requirePermissions('engagement.create'),
 *     requireAAL('aal1'),
 *     async (req, ctx) => { ... }
 *   );
 */

type RouteHandler = (
  req: Request,
  ctx: { user: AuthUser; params?: Record<string, string> }
) => Promise<Response>;

type Guard = (user: AuthUser, req: Request) => Promise<void> | void;

export function withAuth(...guardsThenHandler: [...Guard[], RouteHandler]) {
  const handler = guardsThenHandler[guardsThenHandler.length - 1] as RouteHandler;
  const guards = guardsThenHandler.slice(0, -1) as Guard[];

  return async (req: Request, ctx?: { params?: Record<string, string> }): Promise<Response> => {
    try {
      const user = await requireAuthUser();
      for (const guard of guards) {
        await guard(user, req);
      }
      return await handler(req, { user, params: ctx?.params });
    } catch (err) {
      if (err instanceof AuthError) {
        return Response.json(
          { error: err.code, message: err.message, ...err.metadata },
          { status: err.status }
        );
      }
      console.error('[withAuth] unexpected error', err);
      return Response.json({ error: 'internal_error' }, { status: 500 });
    }
  };
}

/** Require the user to hold each listed permission. */
export function requirePermissions(...perms: Permission[]): Guard {
  return (user) => {
    for (const p of perms) {
      if (!hasPermission(user.roles, p)) {
        throw new AuthError(403, 'missing_permission', `Requires permission: ${p}`, {
          permission: p,
        });
      }
    }
  };
}

const AAL_RANK: Record<AAL, number> = { aal1: 1, aal2: 2, aal3: 3 };

/** Require AAL at least this level. */
export function requireAAL(min: AAL): Guard {
  return (user) => {
    if (AAL_RANK[user.aal] < AAL_RANK[min]) {
      throw new AuthError(403, 'aal_insufficient', `Requires ${min}`, {
        required: min,
        have: user.aal,
      });
    }
  };
}

/**
 * Require a sensitive-action step-up within the given window (minutes).
 * Phase 4 §13.
 */
export function requireFreshStepUp(windowMinutes: number): Guard {
  return (user) => {
    const last = user.sensitiveActionAt;
    if (!last || Date.now() / 1000 - last > windowMinutes * 60) {
      throw new AuthError(403, 'step_up_required', 'Confirm it is you', {
        window_minutes: windowMinutes,
      });
    }
  };
}

const TIER_RANK: Record<VerificationTier, number> = {
  t0: 0,
  t1: 1,
  t2: 2,
  t3: 3,
  t4: 4,
};

/**
 * Require the driver to be verified at at least the given tier.
 * Only meaningful for driver-scoped endpoints; other roles bypass.
 */
export function requireVerificationTier(min: VerificationTier): Guard {
  return (user) => {
    if (!user.roles.includes('driver')) return;
    const have = user.verificationTier ?? 't0';
    if (TIER_RANK[have] < TIER_RANK[min]) {
      throw new AuthError(403, 'verification_tier_insufficient', `Requires ${min}`, {
        required: min,
        have,
      });
    }
  };
}

/** Optional variant of getAuthUser for public routes that behave differently when signed in. */
export { getAuthUser };
