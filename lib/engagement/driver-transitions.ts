/**
 * Driver-side engagement state transitions.
 *
 * The real engagement_status enum in the DB has:
 *   draft, requested, accepted, declined, expired, contract_pending,
 *   confirmed, active, reassigning_pre, reassigning_mid, completed,
 *   cancelled, disputed, partially_resolved, refunded
 *
 * The driver-facing lifecycle simplifies to two transitions:
 *
 *   confirmed  → active     (driver marks: on my way / started)
 *   active     → completed  (driver marks: complete)
 *
 * `activated_at` and `completed_at` are dedicated timestamp columns.
 *
 * Slice 2's status guard (fn_check_engagement_status_transition)
 * enforces the graph at the DB level.
 */

export type DriverAction = 'activate' | 'complete';
export type EngagementStatus =
  | 'draft'
  | 'requested'
  | 'accepted'
  | 'declined'
  | 'expired'
  | 'contract_pending'
  | 'confirmed'
  | 'active'
  | 'reassigning_pre'
  | 'reassigning_mid'
  | 'completed'
  | 'cancelled'
  | 'disputed'
  | 'partially_resolved'
  | 'refunded';

interface TransitionSpec {
  from: EngagementStatus;
  to: EngagementStatus;
  timestampCol?: 'activated_at' | 'completed_at';
  actionLabel: string;
}

const TRANSITIONS: Record<DriverAction, TransitionSpec> = {
  activate: {
    from: 'confirmed',
    to: 'active',
    timestampCol: 'activated_at',
    actionLabel: "I'm on my way",
  },
  complete: {
    from: 'active',
    to: 'completed',
    timestampCol: 'completed_at',
    actionLabel: 'Complete engagement',
  },
};

export function getTransition(action: DriverAction): TransitionSpec {
  return TRANSITIONS[action];
}

export function nextActionFor(status: EngagementStatus): DriverAction | null {
  if (status === 'confirmed') return 'activate';
  if (status === 'active') return 'complete';
  return null;
}

export function statusLabel(status: EngagementStatus): string {
  const map: Record<EngagementStatus, string> = {
    draft: 'Draft',
    requested: 'Requested',
    accepted: 'Accepted',
    declined: 'Declined',
    expired: 'Expired',
    contract_pending: 'Contract pending',
    confirmed: 'Confirmed',
    active: 'Active',
    reassigning_pre: 'Reassigning',
    reassigning_mid: 'Reassigning mid-engagement',
    completed: 'Completed',
    cancelled: 'Cancelled',
    disputed: 'Disputed',
    partially_resolved: 'Partially resolved',
    refunded: 'Refunded',
  };
  return map[status] ?? status;
}
