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

export const PLACEMENT_FEE_BY_TIER: Record<TierLevel, number> = {
  // Placement fee = 1x monthly salary, paid at contract start
  t0: 0,
  t1: 150_000,
  t2: 175_000,
  t3: 225_000,
  t4: 325_000,
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
