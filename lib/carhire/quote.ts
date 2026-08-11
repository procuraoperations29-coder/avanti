/**
 * Car-hire pricing — a bundled car + driver, priced by the vehicle and how
 * long it's needed (days × hours/day). Unlike the driver-only rate-card engine
 * (lib/pricing/quote.ts), this prices a specific partner vehicle instance.
 *
 * Customer pays:  vehicle (daily_rate × days + overtime) + driver (driver_daily_rate × days) + 7.5% VAT
 * Avanti pays:    partner_daily_cost × days  and  driver_daily_pay × days
 * Avanti keeps:   the difference (margin)
 */

export const CARHIRE_VAT_RATE = 0.075;

export interface HireVehiclePricing {
  daily_rate: number;
  partner_daily_cost: number;
  driver_daily_rate: number;
  driver_daily_pay: number;
  included_hours_per_day: number;
  overtime_hourly_rate: number | null;
  min_days: number;
}

export interface CarHireQuoteInput {
  days: number;
  hoursPerDay: number;
}

export interface CarHireQuote {
  days: number;
  hoursPerDay: number;
  overtimeHours: number;
  overtimeTotal: number;
  vehicleSubtotal: number;
  driverSubtotal: number;
  partnerCostTotal: number;
  driverPayTotal: number;
  vatAmount: number;
  offerTotal: number;
  marginTotal: number;
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Inclusive day count between two YYYY-MM-DD dates (min 1). */
export function daysBetween(startDate: string, endDate: string): number {
  const s = new Date(`${startDate}T00:00:00Z`).getTime();
  const e = new Date(`${endDate}T00:00:00Z`).getTime();
  if (Number.isNaN(s) || Number.isNaN(e)) return 1;
  return Math.max(1, Math.round((e - s) / 86_400_000) + 1);
}

export function computeCarHireQuote(v: HireVehiclePricing, input: CarHireQuoteInput): CarHireQuote {
  const days = Math.max(v.min_days || 1, Math.max(1, Math.ceil(input.days)));
  const hoursPerDay = input.hoursPerDay > 0 ? input.hoursPerDay : v.included_hours_per_day;

  const overtimeHours = round2(Math.max(0, hoursPerDay - v.included_hours_per_day) * days);
  const overtimeTotal = round2(overtimeHours * (v.overtime_hourly_rate ?? 0));

  const vehicleSubtotal = round2(v.daily_rate * days + overtimeTotal);
  const driverSubtotal = round2(v.driver_daily_rate * days);
  const partnerCostTotal = round2(v.partner_daily_cost * days);
  const driverPayTotal = round2(v.driver_daily_pay * days);

  const taxable = round2(vehicleSubtotal + driverSubtotal);
  const vatAmount = round2(taxable * CARHIRE_VAT_RATE);
  const offerTotal = round2(taxable + vatAmount);
  const marginTotal = round2(taxable - partnerCostTotal - driverPayTotal);

  return {
    days,
    hoursPerDay,
    overtimeHours,
    overtimeTotal,
    vehicleSubtotal,
    driverSubtotal,
    partnerCostTotal,
    driverPayTotal,
    vatAmount,
    offerTotal,
    marginTotal,
  };
}
