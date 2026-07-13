/**
 * Driver-side engagement state transitions.
 *
 * The state machine (Phase 3 D24):
 *
 *   confirmed  → activated       (driver marks: "on my way")
 *   activated  → in_progress     (driver marks: "started the engagement")
 *   in_progress → completed      (driver marks: "complete")
 *
 * Every transition sets the appropriate timestamp column on the
 * engagement. The `activated_at` and `completed_at` columns exist on
 * the table; there's no dedicated `started_at` — we track that in
 * the `metadata` jsonb blob under `started_at`.
 *
 * Slice 2's status guard (fn_check_engagement_status_transition)
 * enforces the graph at the DB level so any drift here becomes a
 * caught constraint error, not silent corruption.
 */

export type DriverAction = 'activate' | 'start' | 'complete';
export type EngagementStatus =
  | 'draft'
  | 'pending_confirmation'
  | 'confirmed'
  | 'activated'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'expired'
  | 'refunded';

interface TransitionSpec {
  from: EngagementStatus;
  to: EngagementStatus;
  timestampCol?: 'activated_at' | 'completed_at';
  metadataStamp?: 'started_at';
  actionLabel: string;
}

const TRANSITIONS: Record<DriverAction, TransitionSpec> = {
  activate: {
    from: 'confirmed',
    to: 'activated',
    timestampCol: 'activated_at',
    actionLabel: "On my way",
  },
  start: {
    from: 'activated',
    to: 'in_progress',
    metadataStamp: 'started_at',
    actionLabel: 'Start engagement',
  },
  complete: {
    from: 'in_progress',
    to: 'completed',
    timestampCol: 'completed_at',
    actionLabel: 'Complete',
  },
};

export function getTransition(action: DriverAction): TransitionSpec {
  return TRANSITIONS[action];
}

export function nextActionFor(status: EngagementStatus): DriverAction | null {
  if (status === 'confirmed') return 'activate';
  if (status === 'activated') return 'start';
  if (status === 'in_progress') return 'complete';
  return null;
}

/**
 * Human-readable label for a status, used across driver views.
 */
export function statusLabel(status: EngagementStatus): string {
  const map: Record<EngagementStatus, string> = {
    draft: 'Draft',
    pending_confirmation: 'Awaiting payment',
    confirmed: 'Confirmed',
    activated: 'En route',
    in_progress: 'In progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
    expired: 'Expired',
    refunded: 'Refunded',
  };
  return map[status] ?? status;
}
