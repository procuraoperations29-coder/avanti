/**
 * Company constants — safe to expose (they appear on customer invoices).
 *
 * The receiving bank account is Avanti's own; it's printed on invoices so
 * customers can pay by direct transfer as an alternative to the Paystack link.
 * NOTE: transfers to this shared account do NOT auto-reconcile — ops must
 * confirm them by hand and mark the trip invoice paid. The Paystack link is
 * the auto-reconciled path.
 */
export const COMPANY = {
  legalName: 'Avanti Solutions Services',
  supportEmail: 'support@avanti.ng',
} as const;

export const BANK_ACCOUNT = {
  bankName: 'Paystack MFB',
  accountName: 'AVANTI SOLUTIONS SERVICES',
  accountNumber: '0102105473',
} as const;
