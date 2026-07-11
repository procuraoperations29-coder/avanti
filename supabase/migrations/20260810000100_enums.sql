-- ============================================================================
-- Enums
-- ============================================================================

create type user_role as enum (
  'individual_customer', 'driver', 'corporate_admin', 'corporate_member',
  'admin_verifier', 'admin_support', 'admin_finance', 'admin_compliance', 'super_admin'
);

create type engagement_type as enum (
  'immediate', 'hourly', 'half_day', 'full_day',
  'multi_day', 'weekly', 'monthly', 'permanent'
);

create type engagement_status as enum (
  'draft', 'requested', 'accepted', 'declined', 'expired',
  'contract_pending', 'confirmed', 'active',
  'reassigning_pre', 'reassigning_mid',
  'completed', 'cancelled', 'disputed', 'partially_resolved', 'refunded'
);

create type verification_tier as enum ('t0', 't1', 't2', 't3', 't4');

create type verification_status as enum (
  'not_started', 'in_progress', 'submitted', 'under_review',
  'more_info_needed', 'approved', 'rejected'
);

create type verification_event_type as enum (
  'submitted', 'reviewer_assigned', 'approved', 'rejected',
  'more_info_requested', 'auto_check_passed', 'auto_check_failed', 'tier_changed'
);

create type document_type as enum (
  'driver_licence_front', 'driver_licence_back',
  'national_id', 'passport', 'voter_card',
  'utility_bill', 'bank_statement', 'selfie',
  'vehicle_insurance', 'medical_note', 'reference_letter',
  'background_check_result', 'other'
);

create type currency_code as enum ('NGN', 'GHS', 'KES', 'ZAR', 'USD', 'EUR', 'GBP');

create type payment_status as enum (
  'pending', 'authorized', 'captured', 'partially_refunded',
  'refunded', 'failed', 'held'
);

create type payment_method_type as enum ('card', 'bank_transfer', 'mobile_money', 'wallet');

create type payout_status as enum (
  'pending', 'batched', 'initiated', 'completed', 'failed', 'reversed', 'held'
);

create type payout_method_type as enum ('bank_account', 'mobile_money');

create type tax_type as enum (
  'wht', 'vat', 'paye', 'pension', 'statutory_contribution', 'other'
);

create type rate_card_status as enum ('draft', 'published', 'retired');

create type substitution_trigger as enum (
  'driver_cancelled', 'driver_no_show', 'driver_unavailable_mid',
  'verification_lapsed', 'admin_suspended', 'rating_threshold', 'customer_requested'
);

create type substitution_reason as enum (
  'illness', 'family_emergency', 'vehicle_issue', 'safety_concern',
  'schedule_conflict', 'admin_forced', 'other'
);

create type substitution_status as enum (
  'proposed', 'awaiting_customer_approval', 'awaiting_substitute_acceptance',
  'active', 'completed', 'declined', 'cancelled'
);

create type dispute_category as enum (
  'no_show', 'late_arrival', 'service_quality', 'overtime_disagreement',
  'vehicle_damage', 'financial', 'contract_breach',
  'safety_incident', 'misconduct', 'fraud'
);

create type dispute_severity as enum ('low', 'medium', 'high', 'critical');

create type dispute_status as enum (
  'raised', 'triaged', 'awaiting_respondent', 'under_review',
  'mediation', 'escalated',
  'resolved_by_agreement', 'resolved_by_decision', 'withdrawn'
);

create type dispute_outcome_kind as enum (
  'full_refund', 'partial_refund', 'credit_apology', 're_invoice',
  'no_action',
  'driver_warning', 'driver_suspension', 'driver_ban',
  'customer_warning', 'customer_suspension', 'customer_ban',
  'insurance_claim_opened', 'legal_escalation'
);

create type evidence_source as enum ('user_uploaded', 'system_captured', 'third_party');

create type contract_kind as enum (
  'engagement_short', 'engagement_standard', 'engagement_heavy',
  'employment_permanent', 'substitution_addendum'
);

create type contract_status as enum (
  'draft', 'pending_signatures', 'executed', 'superseded', 'terminated'
);

create type signature_role as enum (
  'customer', 'driver', 'corporate_admin', 'avanti_witness'
);

create type approval_status as enum ('pending', 'approved', 'rejected', 'expired');

create type organization_status as enum (
  'pending_verification', 'active', 'suspended', 'closed'
);

create type notification_channel as enum ('email', 'sms', 'push', 'in_app');

create type notification_status as enum ('pending', 'sent', 'delivered', 'failed', 'read');

create type audit_action as enum (
  'create', 'update', 'delete', 'soft_delete',
  'approve', 'reject', 'request_more_info',
  'publish', 'retire', 'sign', 'submit', 'cancel', 'withdraw',
  'authorize', 'capture', 'refund',
  'initiate_payout', 'complete_payout', 'fail_payout', 'reverse_payout',
  'access', 'export'
);

create type day_of_week as enum ('mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun');

create type rating_target as enum ('driver', 'customer');
