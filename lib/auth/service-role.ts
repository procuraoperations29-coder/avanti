import 'server-only';
import { createServiceRoleClient } from '@/lib/supabase/server';
import type { AuthUser } from './types';
import type { Permission } from './permissions';
import { hasPermission } from './permissions';
import { AuthError } from './types';

/**
 * Service-role write helper. Phase 4 §16.
 *
 * Every service-role mutation MUST go through this. It enforces:
 *   1. Explicit identity + permission re-verification (RLS is bypassed).
 *   2. An audit_logs row for every write.
 *   3. Rationale required for high-impact permissions.
 *
 * Callers pass the actor (the AuthUser making the request), the permission
 * required, the entity being touched, and a callback that receives the
 * service-role client to do the actual work.
 *
 * NEVER call createServiceRoleClient() directly outside this helper.
 */

export interface ServiceRoleWriteInput<T> {
  actor: AuthUser;
  permission: Permission;
  action: string; // maps to audit_action enum, e.g. 'update', 'approve', 'publish'
  entityType: string; // logical table name
  entityId?: string | null; // uuid if applicable
  rationale?: string; // required for verification decisions, rate-card publish, role changes
  metadata?: Record<string, unknown>;
  work: (
    client: ReturnType<typeof createServiceRoleClient>
  ) => Promise<T>;
}

const RATIONALE_REQUIRED = new Set<Permission>([
  'verification.decide',
  'rate_card.publish',
  'rate_card.publish.out_of_band',
  'role.grant',
  'role.revoke',
  'user.suspend',
  'driver.suspend',
  'org.suspend',
  'invoice.void',
]);

export async function serviceRoleWrite<T>(input: ServiceRoleWriteInput<T>): Promise<T> {
  // 1. Permission check — RLS is bypassed, so we do it ourselves.
  if (!hasPermission(input.actor.roles, input.permission)) {
    throw new AuthError(403, 'missing_permission', `Requires ${input.permission}`, {
      permission: input.permission,
    });
  }

  if (RATIONALE_REQUIRED.has(input.permission) && (!input.rationale || input.rationale.length < 10)) {
    throw new AuthError(400, 'rationale_required', 'Rationale (10+ chars) required', {
      permission: input.permission,
    });
  }

  const client = createServiceRoleClient();

  // 2. Execute the caller's work.
  const result = await input.work(client);

  // 3. Audit log — best-effort but logged prominently if it fails.
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: auditError } = await (client as any).from('audit_logs').insert({
      actor_user_id: input.actor.id,
      actor_role: input.actor.activeRole,
      entity_type: input.entityType,
      entity_id: input.entityId ?? null,
      action: input.action,
      metadata: {
        permission: input.permission,
        rationale: input.rationale ?? null,
        ...input.metadata,
      },
    });
    if (auditError) {
      console.error('[serviceRoleWrite] audit_logs insert failed', auditError);
    }
  } catch (err) {
    console.error('[serviceRoleWrite] audit_logs insert threw', err);
  }

  return result;
}
