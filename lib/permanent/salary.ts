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
  t1: 150_000,
  t2: 175_000,
  t3: 225_000,
  t4: 325_000,
};

// Placement fee = 70% of a month's salary, paid once at contract start.
// Kept in sync with UPFRONT_RATE in lib/permanent/billing.ts.
export const PLACEMENT_FEE_RATE = 0.7;
export const PLACEMENT_FEE_BY_TIER: Record<TierLevel, number> = {
  t0: 0,
  t1: Math.round(150_000 * PLACEMENT_FEE_RATE),
  t2: Math.round(175_000 * PLACEMENT_FEE_RATE),
  t3: Math.round(225_000 * PLACEMENT_FEE_RATE),
  t4: Math.round(325_000 * PLACEMENT_FEE_RATE),
};

const POSITION_NAMES: Record<TierLevel, string> = {
  t0: '—',
  t1: 'Junior',
  t2: 'Standard',
  t3: 'Professional',
  t4: 'Executive',
};

export function monthlySalaryForTier(tier: TierLevel): number {
  return MONTHLY_SALARY_BY_TIER[tier] ?? 0;
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
