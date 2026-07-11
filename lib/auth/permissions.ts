import type { UserRole } from './types';

/**
 * Permission bundles per role — Phase 4 §11.2.
 *
 * Permissions are strings shaped `resource.action[.scope]`. Every server-side
 * `requirePermissions(p)` check must have a paired RLS policy that enforces
 * the same access. If they diverge, we have a bypass path (Phase 4 D38).
 *
 * The current bundles cover the common resource surface. Additional
 * permissions get added here as features land; RLS gets updated in the
 * same commit.
 */

export type Permission =
  // Engagements
  | 'engagement.create'
  | 'engagement.create.org'
  | 'engagement.read.own'
  | 'engagement.read.assigned'
  | 'engagement.read.org'
  | 'engagement.read.any'
  | 'engagement.update.own'
  | 'engagement.cancel.own'
  // Contracts
  | 'contract.read.own'
  | 'contract.read.org'
  | 'contract.read.any'
  | 'contract.sign.own'
  // Payments
  | 'payment.create'
  | 'payment.read.own'
  | 'payment.read.any'
  | 'refund.create'
  // Payouts (driver + admin)
  | 'payout.read.own'
  | 'payout.read.any'
  | 'payout_method.update'
  | 'payout_batch.execute'
  // Drivers
  | 'driver.search'
  | 'driver.read.public'
  | 'driver.suspend'
  // Documents
  | 'document.create.own'
  | 'document.read.own'
  | 'document.read.for_verification'
  // Verification
  | 'verification.queue.read'
  | 'verification.decide'
  // Ratings
  | 'rating.create.on_own_engagement'
  | 'rating.create.on_assigned_engagement'
  | 'rating.read.own'
  // Disputes
  | 'dispute.raise.on_own_engagement'
  | 'dispute.raise.on_assigned_engagement'
  | 'dispute.respond.own'
  | 'dispute.read.any'
  | 'dispute.decide'
  // Profile / self
  | 'profile.read.own'
  | 'profile.update.own'
  | 'tax_id.update'
  // Availability + jobs
  | 'availability.manage.own'
  | 'job.accept'
  | 'job.decline'
  | 'work_session.create.own'
  | 'work_session.update.own'
  | 'check_in.confirm'
  | 'substitution.report_unavailable'
  | 'substitution.accept_offer'
  // Favourites
  | 'favourite.manage.own'
  // Support
  | 'support_ticket.create'
  | 'support_ticket.read.own'
  | 'support_ticket.read.any'
  | 'support_ticket.assign'
  | 'support_ticket.reply'
  // Corporate
  | 'org.read.own'
  | 'org.update.own'
  | 'org.member.invite'
  | 'org.member.remove'
  | 'org.role.change'
  | 'cost_centre.manage'
  | 'billing.read'
  | 'billing.update'
  | 'invoice.read.related'
  | 'invoice.read.org'
  | 'invoice.read.any'
  | 'invoice.void'
  | 'approval.initiate'
  | 'approval.approve.any_amount'
  | 'recruitment.read.org'
  | 'recruitment.manage.org'
  | 'recruitment.shortlist.on_role'
  // Admin
  | 'user.read.any'
  | 'user.suspend'
  | 'notification.send.to_user'
  | 'rate_card.read.any'
  | 'rate_card.edit_draft'
  | 'rate_card.publish'
  | 'rate_card.publish.out_of_band'
  | 'tax_rule.manage'
  | 'tax_entry.read.any'
  | 'reconciliation.read'
  | 'audit_log.read'
  | 'data_subject_request.manage'
  | 'org.suspend'
  | 'role.grant'
  | 'role.revoke'
  | 'config.read'
  | 'config.update';

const CUSTOMER_BUNDLE: Permission[] = [
  'engagement.create',
  'engagement.read.own',
  'engagement.update.own',
  'engagement.cancel.own',
  'contract.read.own',
  'contract.sign.own',
  'payment.create',
  'payment.read.own',
  'driver.search',
  'driver.read.public',
  'favourite.manage.own',
  'rating.create.on_own_engagement',
  'rating.read.own',
  'dispute.raise.on_own_engagement',
  'dispute.respond.own',
  'profile.read.own',
  'profile.update.own',
  'support_ticket.create',
  'support_ticket.read.own',
];

const DRIVER_BUNDLE: Permission[] = [
  'profile.read.own',
  'profile.update.own',
  'document.create.own',
  'document.read.own',
  'availability.manage.own',
  'job.accept',
  'job.decline',
  'engagement.read.assigned',
  'work_session.create.own',
  'work_session.update.own',
  'check_in.confirm',
  'payout.read.own',
  'payout_method.update',
  'rating.create.on_assigned_engagement',
  'rating.read.own',
  'dispute.raise.on_assigned_engagement',
  'dispute.respond.own',
  'substitution.report_unavailable',
  'substitution.accept_offer',
  'tax_id.update',
  'support_ticket.create',
  'support_ticket.read.own',
];

const CORPORATE_MEMBER_BUNDLE: Permission[] = [
  'engagement.create.org',
  'engagement.read.org',
  'engagement.read.own',
  'engagement.update.own',
  'approval.initiate',
  'recruitment.read.org',
  'recruitment.shortlist.on_role',
  'driver.search',
  'driver.read.public',
  'invoice.read.related',
  'contract.read.own',
  'support_ticket.create',
  'support_ticket.read.own',
  'profile.read.own',
  'profile.update.own',
];

const CORPORATE_ADMIN_BUNDLE: Permission[] = [
  ...CORPORATE_MEMBER_BUNDLE,
  'org.read.own',
  'org.update.own',
  'org.member.invite',
  'org.member.remove',
  'org.role.change',
  'cost_centre.manage',
  'billing.read',
  'billing.update',
  'invoice.read.org',
  'approval.approve.any_amount',
  'recruitment.manage.org',
  'contract.read.org',
];

const ADMIN_VERIFIER_BUNDLE: Permission[] = [
  'verification.queue.read',
  'verification.decide',
  'document.read.for_verification',
];

const ADMIN_SUPPORT_BUNDLE: Permission[] = [
  'user.read.any',
  'engagement.read.any',
  'contract.read.any',
  'support_ticket.read.any',
  'support_ticket.assign',
  'support_ticket.reply',
  'notification.send.to_user',
];

const ADMIN_FINANCE_BUNDLE: Permission[] = [
  'payment.read.any',
  'refund.create',
  'payout.read.any',
  'payout_batch.execute',
  'tax_entry.read.any',
  'tax_rule.manage',
  'rate_card.read.any',
  'rate_card.edit_draft',
  'rate_card.publish',
  'invoice.read.any',
  'invoice.void',
  'reconciliation.read',
];

const ADMIN_COMPLIANCE_BUNDLE: Permission[] = [
  'audit_log.read',
  'data_subject_request.manage',
  'dispute.read.any',
  'dispute.decide',
  'user.suspend',
  'driver.suspend',
  'org.suspend',
];

const SUPER_ADMIN_BUNDLE: Permission[] = [
  ...ADMIN_VERIFIER_BUNDLE,
  ...ADMIN_SUPPORT_BUNDLE,
  ...ADMIN_FINANCE_BUNDLE,
  ...ADMIN_COMPLIANCE_BUNDLE,
  'role.grant',
  'role.revoke',
  'config.read',
  'config.update',
  'rate_card.publish.out_of_band',
];

const BUNDLES: Record<UserRole, Permission[]> = {
  individual_customer: CUSTOMER_BUNDLE,
  driver: DRIVER_BUNDLE,
  corporate_member: CORPORATE_MEMBER_BUNDLE,
  corporate_admin: CORPORATE_ADMIN_BUNDLE,
  admin_verifier: ADMIN_VERIFIER_BUNDLE,
  admin_support: ADMIN_SUPPORT_BUNDLE,
  admin_finance: ADMIN_FINANCE_BUNDLE,
  admin_compliance: ADMIN_COMPLIANCE_BUNDLE,
  super_admin: SUPER_ADMIN_BUNDLE,
};

/**
 * The union of permissions held by any of the given roles.
 */
export function permissionsFor(roles: UserRole[]): Set<Permission> {
  const held = new Set<Permission>();
  for (const role of roles) {
    for (const perm of BUNDLES[role] ?? []) {
      held.add(perm);
    }
  }
  return held;
}

export function hasPermission(roles: UserRole[], permission: Permission): boolean {
  return permissionsFor(roles).has(permission);
}
