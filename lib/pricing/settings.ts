import 'server-only';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * Pricing settings — the editable levers that used to be hardcoded constants.
 * Read from the single-row `pricing_settings` table, falling back to the
 * previous constants so behaviour is unchanged until an admin edits them.
 */

export interface PricingSettings {
  currency: string;
  vatRate: number;
  ondemandCommissionByTier: Record<string, number>;
  tierMonthlySalary: Record<string, number>;
  placementCommissionRate: number;
  placementFeeRate: number;
  placementUpfrontRate: number;
  corporateUpfrontRate: number;
}

export const DEFAULT_PRICING_SETTINGS: PricingSettings = {
  currency: 'NGN',
  vatRate: 0.075,
  ondemandCommissionByTier: { t1: 0.2, t2: 0.2, t3: 0.2, t4: 0.2 },
  tierMonthlySalary: { t1: 150_000, t2: 175_000, t3: 225_000, t4: 325_000 },
  placementCommissionRate: 0.15,
  placementFeeRate: 0.7,
  placementUpfrontRate: 0.7,
  corporateUpfrontRate: 0.7,
};

export async function getPricingSettings(): Promise<PricingSettings> {
  try {
    const admin = createServiceRoleClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (admin as any).from('pricing_settings').select('*').eq('id', 1).maybeSingle();
    if (!data) return DEFAULT_PRICING_SETTINGS;
    return {
      currency: data.currency ?? 'NGN',
      vatRate: Number(data.vat_rate ?? DEFAULT_PRICING_SETTINGS.vatRate),
      ondemandCommissionByTier: (data.ondemand_commission_by_tier as Record<string, number>) ?? DEFAULT_PRICING_SETTINGS.ondemandCommissionByTier,
      tierMonthlySalary: (data.tier_monthly_salary as Record<string, number>) ?? DEFAULT_PRICING_SETTINGS.tierMonthlySalary,
      placementCommissionRate: Number(data.placement_commission_rate ?? DEFAULT_PRICING_SETTINGS.placementCommissionRate),
      placementFeeRate: Number(data.placement_fee_rate ?? DEFAULT_PRICING_SETTINGS.placementFeeRate),
      placementUpfrontRate: Number(data.placement_upfront_rate ?? DEFAULT_PRICING_SETTINGS.placementUpfrontRate),
      corporateUpfrontRate: Number(data.corporate_upfront_rate ?? DEFAULT_PRICING_SETTINGS.corporateUpfrontRate),
    };
  } catch {
    return DEFAULT_PRICING_SETTINGS;
  }
}

// ── Pure helpers (take settings so callers stay testable) ──────────────────

export function tierSalary(s: PricingSettings, tier: string): number {
  return s.tierMonthlySalary[tier] ?? 0;
}

/** One-off placement fee = feeRate × salary, + VAT. */
export function placementFeeInclVat(salary: number, s: PricingSettings): number {
  return Math.round(salary * s.placementFeeRate * (1 + s.vatRate));
}

/** Driver's monthly take-home after the placement commission. */
export function driverTakeHome(salary: number, s: PricingSettings): number {
  return Math.round(salary * (1 - s.placementCommissionRate));
}

/** On-demand commission fraction for a tier (fallback 0.2). */
export function ondemandCommission(s: PricingSettings, tier: string): number {
  const v = s.ondemandCommissionByTier[tier];
  return typeof v === 'number' ? v : 0.2;
}
