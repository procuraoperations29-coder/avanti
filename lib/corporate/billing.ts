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
