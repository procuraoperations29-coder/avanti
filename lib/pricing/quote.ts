import 'server-only';
import { createHash } from 'crypto';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * Pricing engine.
 *
 * Given the engagement configuration (type, tier, vehicle_class, duration),
 * looks up the published rate card and the matching price_rule, then
 * builds a price_quotes row.
 *
 * v1 simplifications:
 *  - Only 'hourly' and 'full_day' engagement types.
 *  - Only weekday day rates (no evening/night/weekend variants).
 *  - Tax added: 7.5% VAT on the customer-facing side (simplification —
 *    strictly it's VAT on commission only, refine later).
 *
 * The resulting price_quote is immutable and expires 10 minutes from
 * creation. Trying to modify one raises via the Slice 2 trigger.
 */

export interface QuoteInput {
  requestedByUserId: string;
  driverId: string;
  engagementType: 'hourly' | 'full_day';
  vehicleClass: 'sedan' | 'suv' | 'executive' | 'van' | 'pickup';
  startsAt: string; // ISO
  durationHours: number;
  countryCode?: string; // default NG
  currency?: string; // default NGN
}

export interface QuoteResult {
  quoteId: string;
  currency: string;
  base: number;
  overtime: number;
  subtotal: number;
  vat: number;
  customerTotal: number;
  expiresAt: string;
  driverTier: string;
  breakdown: {
    unit: 'hour' | 'day';
    unitCount: number;
    unitPrice: number;
    overtimeHours: number;
    overtimeMultiplier: number;
  };
}

const VAT_RATE = 0.075;

export async function buildQuote(input: QuoteInput): Promise<QuoteResult> {
  const country = input.countryCode ?? 'NG';
  const currency = input.currency ?? 'NGN';
  const admin = createServiceRoleClient();

  // 1. Look up driver's tier — pricing gates on min_verification_tier.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: driver, error: driverErr } = await (admin as any)
    .from('driver_profiles')
    .select('verification_tier, vehicle_class_experience, suspended, deleted_at')
    .eq('id', input.driverId)
    .single();
  if (driverErr || !driver) throw new Error('driver_not_found');
  if (driver.suspended || driver.deleted_at) throw new Error('driver_unavailable');

  const tier = driver.verification_tier as string;
  if (!['t2', 't3', 't4'].includes(tier)) {
    throw new Error('driver_not_bookable');
  }
  const canDrive = (driver.vehicle_class_experience ?? []).includes(input.vehicleClass);
  if (!canDrive) throw new Error('driver_class_mismatch');

  // 2. Find the published rate card for country + currency.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rateCard, error: cardErr } = await (admin as any)
    .from('rate_cards')
    .select('id, currency, version')
    .eq('country_code', country)
    .eq('currency', currency)
    .eq('status', 'published')
    .order('effective_from', { ascending: false })
    .limit(1)
    .single();
  if (cardErr || !rateCard) throw new Error('no_rate_card');

  // 3. Find the matching price rule. Pick the highest tier the driver
  //    qualifies for that also matches the vehicle class — so a T3 driver
  //    on a T3-priced rule earns/charges at the T3 rate.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rules, error: rulesErr } = await (admin as any)
    .from('price_rules')
    .select('*')
    .eq('rate_card_id', rateCard.id)
    .eq('engagement_type', input.engagementType)
    .eq('vehicle_class', input.vehicleClass)
    .eq('time_band', 'day')
    .eq('day_type', 'weekday')
    .lte('min_verification_tier', tier)
    .order('min_verification_tier', { ascending: false })
    .limit(1);
  if (rulesErr) throw new Error(`rule_lookup_failed: ${rulesErr.message}`);
  if (!rules || rules.length === 0) throw new Error('no_matching_rule');
  const rule = rules[0];

  // 4. Calculate base + overtime.
  const unit: 'hour' | 'day' = input.engagementType === 'hourly' ? 'hour' : 'day';
  const unitCount = input.engagementType === 'hourly' ? input.durationHours : Math.ceil(input.durationHours / 8);
  const threshold = rule.overtime_threshold_hours ?? (unit === 'hour' ? 4 : 8);
  const multiplier = Number(rule.overtime_multiplier ?? 1.25);

  let base = 0;
  let overtime = 0;
  let overtimeHours = 0;

  if (unit === 'hour') {
    const straightHours = Math.min(unitCount, threshold);
    overtimeHours = Math.max(0, unitCount - threshold);
    base = straightHours * Number(rule.base_customer_price);
    overtime = overtimeHours * Number(rule.base_customer_price) * multiplier;
  } else {
    // Daily: no per-hour overtime for the customer-visible side in v1.
    base = unitCount * Number(rule.base_customer_price);
    overtime = 0;
  }

  // Enforce minimum charge
  const minimum = Number(rule.minimum_charge ?? 0);
  if (base + overtime < minimum) {
    base = minimum;
    overtime = 0;
  }

  const subtotal = base + overtime;
  const vat = Math.round(subtotal * VAT_RATE);
  const customerTotal = subtotal + vat;

  // Driver payout — derived, for storage in the quote.
  const driverPayoutBase =
    unit === 'hour'
      ? Math.min(unitCount, threshold) * Number(rule.base_driver_payout) +
        overtimeHours * Number(rule.base_driver_payout) * multiplier
      : unitCount * Number(rule.base_driver_payout);
  // Commission = what Avanti keeps from the customer (post-VAT).
  // Satisfies constraint: customer_price_total = driver_payout_total + commission_total
  // The VAT portion is separately tracked in tax_breakdown for accounting.
  const commissionTotal = customerTotal - driverPayoutBase;

  // 5. Write the immutable price_quote.
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const endsAt = new Date(
    new Date(input.startsAt).getTime() + input.durationHours * 3600 * 1000
  ).toISOString();

  // Bundle inputs — schema stores them in a single jsonb `inputs` column
  const inputs = {
    starts_at: input.startsAt,
    ends_at: endsAt,
    duration_hours: input.durationHours,
    country_code: country,
    base_amount: base,
    overtime_amount: overtime,
    overtime_hours: overtimeHours,
    overtime_multiplier: multiplier,
    unit,
    unit_count: unitCount,
    unit_price: Number(rule.base_customer_price),
    subtotal,
    minimum_applied: minimum > 0 && base + overtime <= minimum,
  };

  // quote_hash — required by schema (D28 tamper detection).
  // SHA-256 of the canonical input record.
  const quoteHash = createHash('sha256')
    .update(
      JSON.stringify({
        driver_id: input.driverId,
        rate_card_id: rateCard.id,
        engagement_type: input.engagementType,
        min_verification_tier: tier,
        vehicle_class: input.vehicleClass,
        inputs,
      })
    )
    .digest('hex');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: quote, error: quoteErr } = await (admin as any)
    .from('price_quotes')
    .insert({
      rate_card_id: rateCard.id,
      rate_card_version: rateCard.version ?? 1,
      price_rule_id: rule.id,
      currency,
      engagement_type: input.engagementType,
      min_verification_tier: tier,
      vehicle_class: input.vehicleClass,
      inputs,
      customer_price_total: customerTotal,
      driver_payout_total: driverPayoutBase,
      commission_total: commissionTotal,
      tax_breakdown: { vat, wht: 0 },
      requested_by_user_id: input.requestedByUserId,
      driver_id: input.driverId,
      quote_hash: quoteHash,
      expires_at: expiresAt,
    })
    .select('id')
    .single();
  if (quoteErr || !quote) {
    throw new Error(`quote_write_failed: ${quoteErr?.message ?? 'unknown'}`);
  }

  return {
    quoteId: quote.id,
    currency,
    base,
    overtime,
    subtotal,
    vat,
    customerTotal,
    expiresAt,
    driverTier: tier,
    breakdown: {
      unit,
      unitCount,
      unitPrice: Number(rule.base_customer_price),
      overtimeHours,
      overtimeMultiplier: multiplier,
    },
  };
}
