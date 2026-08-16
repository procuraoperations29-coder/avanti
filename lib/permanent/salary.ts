import type { TierLevel } from '@/components/avanti/tier-badge';

/**
 * Monthly salary for permanent driver placements, by tier.
 *
 * Set by Avanti — customers don't propose budgets. Adjust these values
 * to shift market positioning. Values in Naira.
 *
 * Positioning names shown to customers on the browse page and dossier:
 *   T2 → Standard
 *   T3 → Professional
 *   T4 → Executive
 */

export const MONTHLY_SALARY_BY_TIER: Record<TierLevel, number> = {
  t0: 0,
  t1: 120_000,
  t2: 150_000,
  t3: 175_000,
  t4: 200_000,
};

// Placement fee = 70% of a month's salary + 7.5% VAT, paid once at contract
// start. Kept in sync with UPFRONT_RATE / VAT_RATE in lib/permanent/billing.ts.
// (The monthly salary itself is VAT-free.)
export const PLACEMENT_FEE_RATE = 0.7;
export const PLACEMENT_FEE_VAT_RATE = 0.075;
const feeInclVat = (salary: number) =>
  Math.round(salary * PLACEMENT_FEE_RATE * (1 + PLACEMENT_FEE_VAT_RATE));
export const PLACEMENT_FEE_BY_TIER: Record<TierLevel, number> = {
  t0: 0,
  t1: feeInclVat(120_000),
  t2: feeInclVat(150_000),
  t3: feeInclVat(175_000),
  t4: feeInclVat(200_000),
};

const POSITION_NAMES: Record<TierLevel, string> = {
  t0: '—',
  t1: 'Junior',
  t2: 'Standard',
  t3: 'Professional',
  t4: 'Executive',
};

// Avanti keeps a 15% commission out of the monthly salary the customer pays;
// the driver receives the remaining 85%.
export const PLACEMENT_COMMISSION_RATE = 0.15;

export function monthlySalaryForTier(tier: TierLevel): number {
  return MONTHLY_SALARY_BY_TIER[tier] ?? 0;
}

/** The driver's take-home from a gross monthly salary, after the 15% commission. */
export function driverTakeHome(grossSalary: number): number {
  return Math.round(grossSalary * (1 - PLACEMENT_COMMISSION_RATE));
}

/** The driver's take-home monthly salary for a tier, after the 15% commission. */
export function driverNetSalaryForTier(tier: TierLevel): number {
  return driverTakeHome(monthlySalaryForTier(tier));
}

export function placementFeeForTier(tier: TierLevel): number {
  return PLACEMENT_FEE_BY_TIER[tier] ?? 0;
}

export function positionNameForTier(tier: TierLevel): string {
  return POSITION_NAMES[tier] ?? '—';
}

export function formatNaira(n: number): string {
  return `₦${n.toLocaleString('en-NG')}`;
}
