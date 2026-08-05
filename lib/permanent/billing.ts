import 'server-only';
import { publicEnv } from '@/config/env';
import { initTransaction } from '@/lib/payments/paystack';
import { sendEmail } from '@/lib/email/resend';
import { placementInvoiceEmail } from '@/lib/email/templates/placement-invoice';

/**
 * Permanent-placement billing engine.
 *
 * Model:
 *   - Upfront: 70% of one month's salary, raised when the placement is created,
 *     due before it activates.
 *   - Monthly: the full salary, invoiced ~2 days before the billing day each
 *     month (that invoice email doubles as the reminder). Paid to Avanti.
 *
 * The daily cron (runPlacementBillingCycle) is idempotent: the unique
 * (placement_id, kind, period_month) constraint stops duplicate invoices, and
 * we skip any period already invoiced.
 */

export const UPFRONT_RATE = 0.7;
export const VAT_RATE = 0.075; // 7.5% VAT charged on the placement fee (the monthly salary is VAT-free)
const REMIND_DAYS_BEFORE = 2;

/** Upfront placement fee (70% of a month's salary) with 7.5% VAT on top. */
export function computeUpfront(monthlySalary: number): number {
  return Math.round(monthlySalary * UPFRONT_RATE * (1 + VAT_RATE));
}

export function deriveBillingDay(startISO: string): number {
  const d = new Date(startISO);
  const day = d.getUTCDate();
  return Math.min(Number.isFinite(day) && day > 0 ? day : 1, 28);
}

function formatNaira(n: number): string {
  return `₦${Math.round(n).toLocaleString('en-NG')}`;
}
function fmtDate(d: Date): string {
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}
function monthLabel(d: Date): string {
  return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}
function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

interface InvoiceRow {
  id: string;
  placement_id: string;
  customer_user_id: string;
  kind: 'upfront' | 'monthly';
  period_month: string | null;
  amount: number;
  due_date: string;
}

/**
 * Generate a Paystack link for an existing invoice row and email it to the
 * customer, then stamp the row. Shared by upfront + monthly.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function raiseAndSend(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  invoice: InvoiceRow,
  ctx: { customerName: string; customerEmail: string; driverName: string },
  isReminder: boolean
): Promise<boolean> {
  const reference = `PLINV-${invoice.id.slice(0, 8)}-${Date.now()}`;
  const callbackUrl = `${publicEnv.NEXT_PUBLIC_APP_URL ?? ''}/customer/engagements`;

  let payLink: string;
  try {
    const init = await initTransaction({
      email: ctx.customerEmail,
      amountNaira: Number(invoice.amount),
      reference,
      callbackUrl,
      metadata: { type: 'placement_invoice', placementInvoiceId: invoice.id, placementId: invoice.placement_id },
    });
    payLink = init.authorizationUrl;
  } catch (err) {
    console.error('[placement-billing] paystack init failed', invoice.id, err);
    return false;
  }

  const due = new Date(invoice.due_date);
  const { subject, html } = placementInvoiceEmail({
    customerName: ctx.customerName,
    driverName: ctx.driverName,
    kind: invoice.kind,
    periodLabel: invoice.period_month ? monthLabel(new Date(invoice.period_month)) : null,
    amountFormatted: formatNaira(Number(invoice.amount)),
    dueDateFormatted: fmtDate(due),
    payLink,
    isReminder,
  });

  try {
    await sendEmail({ to: ctx.customerEmail, subject, html });
  } catch (err) {
    console.error('[placement-billing] email failed', invoice.id, err);
    // Keep the link/reference so the customer can still be billed; don't abort.
  }

  const now = new Date().toISOString();
  await admin
    .from('placement_invoices')
    .update({
      payment_reference: reference,
      payment_link: payLink,
      invoice_sent_at: now,
      reminder_sent_at: isReminder ? now : null,
      updated_at: now,
    })
    .eq('id', invoice.id);
  return true;
}

/**
 * Raise the 70%-upfront invoice for a freshly-created placement and email it.
 * Called from the enquiry -> matched flow.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function issueUpfrontInvoice(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  placement: { id: string; customer_user_id: string; monthly_salary: number; currency?: string },
  ctx: { customerName: string; customerEmail: string; driverName: string }
): Promise<{ ok: boolean; invoiceId?: string }> {
  const amount = computeUpfront(Number(placement.monthly_salary));
  const dueDate = isoDate(new Date());

  const { data: inserted, error } = await admin
    .from('placement_invoices')
    .insert({
      placement_id: placement.id,
      customer_user_id: placement.customer_user_id,
      kind: 'upfront',
      period_month: null,
      amount,
      currency: placement.currency ?? 'NGN',
      due_date: dueDate,
      status: 'pending',
      payment_status: 'unpaid',
    })
    .select('id, placement_id, customer_user_id, kind, period_month, amount, due_date')
    .single();
  if (error || !inserted) {
    console.error('[placement-billing] upfront insert failed', placement.id, error);
    return { ok: false };
  }

  const sent = await raiseAndSend(admin, inserted as InvoiceRow, ctx, false);
  return { ok: sent, invoiceId: inserted.id };
}

/**
 * Daily cron. For each active placement, if today is REMIND_DAYS_BEFORE days
 * before its billing day, create+send that month's invoice (which serves as
 * the reminder). Also flips past-due unpaid invoices to 'overdue'.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function runPlacementBillingCycle(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  now: Date
): Promise<{ invoiced: number; overdue: number }> {
  // Mark overdue first (cheap, independent).
  const todayIso = isoDate(now);
  const { data: overdueRows } = await admin
    .from('placement_invoices')
    .update({ status: 'overdue', updated_at: now.toISOString() })
    .lt('due_date', todayIso)
    .eq('payment_status', 'unpaid')
    .in('status', ['pending'])
    .select('id');
  const overdue = (overdueRows ?? []).length;

  // The due date we bill for is REMIND_DAYS_BEFORE days from today.
  const target = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + REMIND_DAYS_BEFORE));
  const targetDay = target.getUTCDate();
  const periodMonth = isoDate(new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), 1)));
  const dueDate = isoDate(target);

  const { data: placements } = await admin
    .from('placements')
    .select('id, customer_user_id, driver_id, monthly_salary, currency, billing_day, status')
    .eq('status', 'active');
  const active = (placements ?? []).filter(
    (p: { billing_day: number | null }) => p.billing_day === targetDay
  );
  if (active.length === 0) return { invoiced: 0, overdue };

  // Resolve customer + driver names/emails once.
  const customerIds = Array.from(new Set(active.map((p: { customer_user_id: string }) => p.customer_user_id)));
  const driverIds = Array.from(new Set(active.map((p: { driver_id: string }) => p.driver_id)));
  const { data: customers } = await admin.from('users').select('id, full_name, email').in('id', customerIds);
  const custById = Object.fromEntries(
    (customers ?? []).map((u: { id: string; full_name: string | null; email: string | null }) => [u.id, u])
  );
  const { data: driverProfiles } = await admin.from('driver_profiles').select('id, user_id').in('id', driverIds);
  const driverUserIds = (driverProfiles ?? []).map((d: { user_id: string | null }) => d.user_id).filter(Boolean);
  const { data: driverUsers } = driverUserIds.length
    ? await admin.from('users').select('id, full_name').in('id', driverUserIds)
    : { data: [] };
  const driverNameByUser = Object.fromEntries(
    (driverUsers ?? []).map((u: { id: string; full_name: string | null }) => [u.id, u.full_name ?? 'your driver'])
  );
  const driverNameByProfile = Object.fromEntries(
    (driverProfiles ?? []).map((d: { id: string; user_id: string | null }) => [d.id, driverNameByUser[d.user_id ?? ''] ?? 'your driver'])
  );

  let invoiced = 0;
  for (const p of active as {
    id: string;
    customer_user_id: string;
    driver_id: string;
    monthly_salary: number;
    currency: string | null;
  }[]) {
    const customer = custById[p.customer_user_id];
    if (!customer?.email) continue; // can't invoice without an email

    // Skip if this month's invoice already exists (idempotent).
    const { data: existing } = await admin
      .from('placement_invoices')
      .select('id')
      .eq('placement_id', p.id)
      .eq('kind', 'monthly')
      .eq('period_month', periodMonth)
      .maybeSingle();
    if (existing) continue;

    const { data: inserted, error } = await admin
      .from('placement_invoices')
      .insert({
        placement_id: p.id,
        customer_user_id: p.customer_user_id,
        kind: 'monthly',
        period_month: periodMonth,
        amount: Number(p.monthly_salary),
        currency: p.currency ?? 'NGN',
        due_date: dueDate,
        status: 'pending',
        payment_status: 'unpaid',
      })
      .select('id, placement_id, customer_user_id, kind, period_month, amount, due_date')
      .single();
    if (error || !inserted) {
      console.error('[placement-billing] monthly insert failed', p.id, error);
      continue;
    }

    const ok = await raiseAndSend(admin, inserted as InvoiceRow, {
      customerName: customer.full_name ?? 'there',
      customerEmail: customer.email,
      driverName: driverNameByProfile[p.driver_id] ?? 'your driver',
    }, true);
    if (ok) invoiced += 1;
  }

  return { invoiced, overdue };
}
