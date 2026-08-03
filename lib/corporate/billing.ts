import 'server-only';
import { publicEnv } from '@/config/env';
import { BANK_ACCOUNT } from '@/config/company';
import { initTransaction } from '@/lib/payments/paystack';
import { sendEmail } from '@/lib/email/resend';
import { brandedEmail } from '@/lib/email/templates/branded';

/**
 * Corporate staffing billing — aggregated per ORGANISATION (never per driver).
 * One invoice + one payment link covers every driver it bills for.
 *
 *   Upfront: 70% of the COMBINED monthly rate of all pending, not-yet-invoiced
 *   assignments. Paying it activates them all (webhook, via assignment_ids).
 *
 * Attendance-based monthly aggregate invoicing arrives in the next step.
 */
export const CORP_UPFRONT_RATE = 0.7;
// A full working month for salary proration (Mon–Fri). Present days beyond this
// are capped at the monthly rate; extra pay only comes via approved overtime.
export const CORP_WORKING_DAYS = 22;

function formatNaira(n: number): string {
  return `₦${Math.round(n).toLocaleString('en-NG')}`;
}
function fmtDate(d: Date): string {
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * Raise ONE upfront invoice for an org covering all pending assignments that
 * aren't already on an upfront invoice. Emails the org a single link.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function raiseCorporateUpfrontInvoice(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  orgId: string
): Promise<{ ok: boolean; reason?: string; invoiceId?: string; drivers?: number }> {
  try {
    // Pending assignments for the org.
    const { data: pending } = await admin
      .from('corporate_assignments')
      .select('id, driver_id, monthly_rate, currency')
      .eq('organization_id', orgId)
      .eq('status', 'pending');
    const pendingList = pending ?? [];
    if (pendingList.length === 0) return { ok: false, reason: 'no_pending_assignments' };

    // Which of those are already on an upfront invoice (unpaid or paid)?
    const { data: existingInvoices } = await admin
      .from('corporate_invoices')
      .select('assignment_ids, status')
      .eq('organization_id', orgId)
      .eq('kind', 'upfront')
      .in('status', ['pending', 'paid', 'overdue']);
    const covered = new Set<string>();
    for (const inv of existingInvoices ?? []) {
      for (const aid of (inv.assignment_ids ?? []) as string[]) covered.add(aid);
    }

    const toBill = pendingList.filter((a: { id: string }) => !covered.has(a.id));
    if (toBill.length === 0) return { ok: false, reason: 'already_invoiced' };

    // Driver names for the line items.
    const driverIds = Array.from(new Set(toBill.map((a: { driver_id: string }) => a.driver_id)));
    const { data: profs } = await admin.from('driver_profiles').select('id, user_id').in('id', driverIds);
    const uids = (profs ?? []).map((p: { user_id: string | null }) => p.user_id).filter(Boolean);
    const { data: us } = uids.length ? await admin.from('users').select('id, full_name').in('id', uids) : { data: [] };
    const nameByUser = Object.fromEntries((us ?? []).map((u: { id: string; full_name: string | null }) => [u.id, u.full_name ?? 'Driver']));
    const nameByDriver = Object.fromEntries((profs ?? []).map((p: { id: string; user_id: string | null }) => [p.id, nameByUser[p.user_id ?? ''] ?? 'Driver']));

    const currency = toBill[0]?.currency ?? 'NGN';
    const lineItems = toBill.map((a: { id: string; driver_id: string; monthly_rate: number }) => ({
      assignment_id: a.id,
      driver: nameByDriver[a.driver_id] ?? 'Driver',
      monthly_rate: Number(a.monthly_rate),
      upfront: Math.round(Number(a.monthly_rate) * CORP_UPFRONT_RATE),
    }));
    const amount = lineItems.reduce((s: number, li: { upfront: number }) => s + li.upfront, 0);
    const assignmentIds = toBill.map((a: { id: string }) => a.id);
    const due = new Date();

    const { data: inv, error } = await admin
      .from('corporate_invoices')
      .insert({
        organization_id: orgId,
        assignment_id: null,
        assignment_ids: assignmentIds,
        kind: 'upfront',
        amount,
        currency,
        due_date: due.toISOString().slice(0, 10),
        line_items: lineItems,
        status: 'pending',
        payment_status: 'unpaid',
      })
      .select('id')
      .single();
    if (error || !inv) {
      console.error('[corporate-billing] aggregate upfront insert failed', orgId, error);
      return { ok: false, reason: 'insert_failed' };
    }

    const { data: org } = await admin.from('organizations').select('name, billing_email').eq('id', orgId).single();
    const payerEmail = org?.billing_email || `org${orgId.slice(0, 8)}@customer.avanti.ng`;

    const reference = `CORPINV-${inv.id.slice(0, 8)}-${Date.now()}`;
    let payLink = '';
    try {
      const init = await initTransaction({
        email: payerEmail,
        amountNaira: amount,
        reference,
        callbackUrl: `${publicEnv.NEXT_PUBLIC_APP_URL ?? ''}/corporate`,
        metadata: { type: 'corporate_invoice', corporateInvoiceId: inv.id },
      });
      payLink = init.authorizationUrl;
    } catch (err) {
      console.error('[corporate-billing] paystack init failed', inv.id, err);
    }

    if (payLink) {
      await sendEmail({
        to: payerEmail,
        subject: `Avanti — activate ${toBill.length} driver${toBill.length === 1 ? '' : 's'} (70% upfront)`,
        html: brandedEmail({
          eyebrow: 'Drivers assigned',
          greeting: `Hi ${org?.name ?? 'there'},`,
          headline: `${toBill.length} driver${toBill.length === 1 ? '' : 's'} matched to your team`,
          paragraphs: [
            `To activate ${toBill.length === 1 ? 'this driver' : 'these drivers'}, an upfront payment of 70% of the combined monthly rate is due. They start once it's received.`,
          ],
          summary: [
            ...lineItems.map((li: { driver: string; upfront: number }) => ({ label: li.driver, value: formatNaira(li.upfront) })),
            { label: 'Total upfront (70%)', value: formatNaira(amount) },
            { label: 'Due', value: fmtDate(due) },
          ],
          cta: { label: 'Pay securely online', url: payLink },
          footerNote: `Or transfer to ${BANK_ACCOUNT.bankName} · ${BANK_ACCOUNT.accountNumber} · ${BANK_ACCOUNT.accountName}. Reply with proof of payment so we can confirm.`,
        }),
      });
    }

    const now = new Date().toISOString();
    await admin
      .from('corporate_invoices')
      .update({ payment_reference: reference, payment_link: payLink || null, invoice_sent_at: now, updated_at: now })
      .eq('id', inv.id);

    return { ok: true, invoiceId: inv.id, drivers: toBill.length };
  } catch (err) {
    console.error('[corporate-billing] raiseCorporateUpfrontInvoice failed', orgId, err);
    return { ok: false, reason: 'exception' };
  }
}

function monthLabel(d: Date): string {
  return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

/**
 * Daily cron: on each org's billing day, raise ONE aggregate monthly invoice
 * for the PREVIOUS calendar month, auto-computed from attendance + approved
 * overtime across all active drivers. Idempotent (one per org per period).
 *
 *   per driver: base = min(present_days, 22) x (monthly_rate / 22)   [capped]
 *             + approved overtime hours x overtime_hourly_rate       [no cut]
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function runCorporateMonthlyBilling(admin: any, now: Date): Promise<{ invoiced: number }> {
  const targetDay = now.getUTCDate();
  const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const periodStartIso = periodStart.toISOString().slice(0, 10);
  const periodEndIso = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0)).toISOString().slice(0, 10);
  const periodMonthIso = periodStartIso;
  const dueIso = now.toISOString().slice(0, 10);

  const { data: orgs } = await admin
    .from('organizations')
    .select('id, name, billing_email')
    .eq('status', 'active')
    .eq('billing_day', targetDay);

  let invoiced = 0;
  for (const org of orgs ?? []) {
    // Idempotent: one monthly invoice per org per period.
    const { data: existing } = await admin
      .from('corporate_invoices')
      .select('id')
      .eq('organization_id', org.id)
      .eq('kind', 'monthly')
      .eq('period_month', periodMonthIso)
      .maybeSingle();
    if (existing) continue;

    const { data: asgs } = await admin
      .from('corporate_assignments')
      .select('id, driver_id, monthly_rate, driver_monthly_pay, overtime_hourly_rate, currency, start_date')
      .eq('organization_id', org.id)
      .eq('status', 'active')
      .lte('start_date', periodEndIso);
    if (!asgs || asgs.length === 0) continue;
    const asgIds = asgs.map((a: { id: string }) => a.id);

    const { data: att } = await admin
      .from('corporate_attendance')
      .select('assignment_id')
      .eq('status', 'present')
      .gte('work_date', periodStartIso)
      .lte('work_date', periodEndIso)
      .in('assignment_id', asgIds);
    const presentCount: Record<string, number> = {};
    for (const r of att ?? []) presentCount[r.assignment_id] = (presentCount[r.assignment_id] ?? 0) + 1;

    const { data: ot } = await admin
      .from('corporate_overtime')
      .select('assignment_id, hours')
      .eq('status', 'approved')
      .gte('work_date', periodStartIso)
      .lte('work_date', periodEndIso)
      .in('assignment_id', asgIds);
    const otHours: Record<string, number> = {};
    for (const r of ot ?? []) otHours[r.assignment_id] = (otHours[r.assignment_id] ?? 0) + Number(r.hours);

    // Driver names
    const dIds = Array.from(new Set(asgs.map((a: { driver_id: string }) => a.driver_id)));
    const { data: profs } = await admin.from('driver_profiles').select('id, user_id').in('id', dIds);
    const uids = (profs ?? []).map((p: { user_id: string | null }) => p.user_id).filter(Boolean);
    const { data: us } = uids.length ? await admin.from('users').select('id, full_name').in('id', uids) : { data: [] };
    const nameByUser = Object.fromEntries((us ?? []).map((u: { id: string; full_name: string | null }) => [u.id, u.full_name ?? 'Driver']));
    const nameByDriver = Object.fromEntries((profs ?? []).map((p: { id: string; user_id: string | null }) => [p.id, nameByUser[p.user_id ?? ''] ?? 'Driver']));

    const lineItems: Record<string, unknown>[] = [];
    const payoutRows: Record<string, unknown>[] = [];
    let amount = 0;
    for (const a of asgs) {
      const present = presentCount[a.id] ?? 0;
      const cappedDays = Math.min(present, CORP_WORKING_DAYS);
      const base = Math.round(cappedDays * (Number(a.monthly_rate) / CORP_WORKING_DAYS));
      const hrs = otHours[a.id] ?? 0;
      const otAmt = Math.round(hrs * Number(a.overtime_hourly_rate));
      const total = base + otAmt;
      if (total <= 0) continue;
      lineItems.push({ assignment_id: a.id, driver: nameByDriver[a.driver_id] ?? 'Driver', present_days: present, base, overtime_hours: hrs, overtime: otAmt, total });
      amount += total;

      // Driver's own payout for the same period (uses driver_monthly_pay;
      // overtime is pass-through, so the same otAmt the org was billed).
      const driverBase = Math.round(cappedDays * (Number(a.driver_monthly_pay) / CORP_WORKING_DAYS));
      payoutRows.push({
        assignment_id: a.id,
        driver_id: a.driver_id,
        organization_id: org.id,
        period_month: periodMonthIso,
        present_days: present,
        base_amount: driverBase,
        overtime_hours: hrs,
        overtime_amount: otAmt,
        total: driverBase + otAmt,
        currency: a.currency ?? 'NGN',
        status: 'pending',
      });
    }
    if (amount <= 0) continue;

    const currency = asgs[0]?.currency ?? 'NGN';
    const { data: inv, error } = await admin
      .from('corporate_invoices')
      .insert({
        organization_id: org.id,
        assignment_id: null,
        assignment_ids: lineItems.map((li) => li.assignment_id),
        kind: 'monthly',
        period_month: periodMonthIso,
        amount,
        currency,
        due_date: dueIso,
        line_items: lineItems,
        status: 'pending',
        payment_status: 'unpaid',
      })
      .select('id')
      .single();
    if (error || !inv) {
      console.error('[corporate-billing] monthly insert failed', org.id, error);
      continue;
    }

    // Queue the driver payouts for the same period (idempotent).
    if (payoutRows.length > 0) {
      await admin
        .from('corporate_payouts')
        .upsert(payoutRows, { onConflict: 'assignment_id,period_month', ignoreDuplicates: true });
    }

    const payerEmail = org.billing_email || `org${String(org.id).slice(0, 8)}@customer.avanti.ng`;
    const reference = `CORPINV-${inv.id.slice(0, 8)}-${Date.now()}`;
    let payLink = '';
    try {
      const init = await initTransaction({
        email: payerEmail,
        amountNaira: amount,
        reference,
        callbackUrl: `${publicEnv.NEXT_PUBLIC_APP_URL ?? ''}/corporate`,
        metadata: { type: 'corporate_invoice', corporateInvoiceId: inv.id },
      });
      payLink = init.authorizationUrl;
    } catch (err) {
      console.error('[corporate-billing] monthly paystack init failed', inv.id, err);
    }

    if (payLink) {
      await sendEmail({
        to: payerEmail,
        subject: `Avanti — ${monthLabel(periodStart)} invoice`,
        html: brandedEmail({
          eyebrow: 'Monthly invoice',
          greeting: `Hi ${org.name},`,
          headline: `Your ${monthLabel(periodStart)} invoice`,
          paragraphs: [
            'This covers your drivers for the month, based on their recorded attendance plus any overtime you approved.',
          ],
          summary: [
            ...lineItems.map((li) => ({
              label: `${li.driver} (${li.present_days}d${(li.overtime_hours as number) > 0 ? ` +${li.overtime_hours}h OT` : ''})`,
              value: formatNaira(li.total as number),
            })),
            { label: 'Total', value: formatNaira(amount) },
          ],
          cta: { label: 'Pay securely online', url: payLink },
          footerNote: `Or transfer to ${BANK_ACCOUNT.bankName} · ${BANK_ACCOUNT.accountNumber} · ${BANK_ACCOUNT.accountName}.`,
        }),
      });
    }

    const nowIso = new Date().toISOString();
    await admin
      .from('corporate_invoices')
      .update({ payment_reference: reference, payment_link: payLink || null, invoice_sent_at: nowIso, updated_at: nowIso })
      .eq('id', inv.id);
    invoiced += 1;
  }

  return { invoiced };
}

/**
 * Called from the webhook when a corporate invoice is paid — emails the org a
 * receipt. (Upfront payment also activates the covered drivers; that's done in
 * the webhook via assignment_ids.)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function notifyCorporateInvoicePaid(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  invoice: { organization_id: string; kind: string; amount: number; assignment_ids: string[] | null }
): Promise<void> {
  try {
    const { data: org } = await admin
      .from('organizations')
      .select('name, billing_email')
      .eq('id', invoice.organization_id)
      .single();
    if (!org?.billing_email) return;

    const count = (invoice.assignment_ids ?? []).length;
    await sendEmail({
      to: org.billing_email,
      subject: 'Payment received — Avanti',
      html: brandedEmail({
        eyebrow: 'Payment received',
        greeting: `Hi ${org.name},`,
        headline:
          invoice.kind === 'upfront'
            ? `${count} driver${count === 1 ? '' : 's'} now active`
            : 'Payment received',
        paragraphs: [
          invoice.kind === 'upfront'
            ? `We've received your upfront payment. ${count === 1 ? 'Your driver is' : 'Your drivers are'} now active on your account.`
            : "We've received your payment. Thank you.",
        ],
        summary: [{ label: 'Amount', value: formatNaira(Number(invoice.amount)) }],
      }),
    });
  } catch (err) {
    console.error('[corporate-billing] notifyCorporateInvoicePaid failed', invoice.organization_id, err);
  }
}
