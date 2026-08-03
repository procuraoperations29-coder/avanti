import 'server-only';
import { publicEnv } from '@/config/env';
import { BANK_ACCOUNT } from '@/config/company';
import { initTransaction } from '@/lib/payments/paystack';
import { sendEmail } from '@/lib/email/resend';
import { brandedEmail } from '@/lib/email/templates/branded';

/**
 * Corporate staffing billing. On assignment we raise a 70%-of-monthly upfront
 * invoice; the assignment stays 'pending' until it's paid (webhook activates
 * it). The invoice email doubles as the "driver assigned" notice to the org.
 * Attendance-based monthly invoicing arrives with Phase 2.
 */
export const CORP_UPFRONT_RATE = 0.7;

function formatNaira(n: number): string {
  return `₦${Math.round(n).toLocaleString('en-NG')}`;
}
function fmtDate(d: Date): string {
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * Called from the Paystack webhook when a corporate invoice is paid. Emails the
 * org a receipt (upfront payment activates the driver, handled by the webhook).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function notifyCorporateInvoicePaid(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  invoice: { organization_id: string; assignment_id: string | null; kind: string; amount: number }
): Promise<void> {
  try {
    const { data: org } = await admin
      .from('organizations')
      .select('name, billing_email')
      .eq('id', invoice.organization_id)
      .single();
    if (!org?.billing_email) return;

    let driverName = 'your driver';
    if (invoice.assignment_id) {
      const { data: asg } = await admin
        .from('corporate_assignments')
        .select('driver_id')
        .eq('id', invoice.assignment_id)
        .single();
      if (asg?.driver_id) {
        const { data: dp } = await admin.from('driver_profiles').select('user_id').eq('id', asg.driver_id).single();
        if (dp?.user_id) {
          const { data: du } = await admin.from('users').select('full_name').eq('id', dp.user_id).single();
          driverName = du?.full_name ?? 'your driver';
        }
      }
    }

    await sendEmail({
      to: org.billing_email,
      subject: 'Payment received — Avanti',
      html: brandedEmail({
        eyebrow: 'Payment received',
        greeting: `Hi ${org.name},`,
        headline: invoice.kind === 'upfront' ? `${driverName} is now active` : 'Payment received',
        paragraphs: [
          invoice.kind === 'upfront'
            ? `We've received your upfront payment. ${driverName} is now active on your account.`
            : "We've received your payment. Thank you.",
        ],
        summary: [{ label: 'Amount', value: formatNaira(Number(invoice.amount)) }],
      }),
    });
  } catch (err) {
    console.error('[corporate-billing] notifyCorporateInvoicePaid failed', invoice.organization_id, err);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function issueCorporateUpfrontInvoice(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  assignment: { id: string; organization_id: string; monthly_rate: number; currency?: string },
  driverName: string
): Promise<{ ok: boolean; invoiceId?: string }> {
  try {
    const amount = Math.round(Number(assignment.monthly_rate) * CORP_UPFRONT_RATE);
    const due = new Date();

    const { data: inv, error } = await admin
      .from('corporate_invoices')
      .insert({
        organization_id: assignment.organization_id,
        assignment_id: assignment.id,
        kind: 'upfront',
        amount,
        currency: assignment.currency ?? 'NGN',
        due_date: due.toISOString().slice(0, 10),
        status: 'pending',
        payment_status: 'unpaid',
      })
      .select('id')
      .single();
    if (error || !inv) {
      console.error('[corporate-billing] upfront insert failed', assignment.id, error);
      return { ok: false };
    }

    const { data: org } = await admin
      .from('organizations')
      .select('name, billing_email')
      .eq('id', assignment.organization_id)
      .single();
    const payerEmail = org?.billing_email || `org${assignment.organization_id.slice(0, 8)}@customer.avanti.ng`;

    const reference = `CORPINV-${inv.id.slice(0, 8)}-${Date.now()}`;
    let payLink = '';
    try {
      const init = await initTransaction({
        email: payerEmail,
        amountNaira: amount,
        reference,
        callbackUrl: `${publicEnv.NEXT_PUBLIC_APP_URL ?? ''}/corporate`,
        metadata: { type: 'corporate_invoice', corporateInvoiceId: inv.id, assignmentId: assignment.id },
      });
      payLink = init.authorizationUrl;
    } catch (err) {
      console.error('[corporate-billing] paystack init failed', inv.id, err);
    }

    if (payLink) {
      await sendEmail({
        to: payerEmail,
        subject: `Avanti — activate ${driverName} with a 70% upfront payment`,
        html: brandedEmail({
          eyebrow: 'Driver assigned',
          greeting: `Hi ${org?.name ?? 'there'},`,
          headline: `We've matched ${driverName} to your team`,
          paragraphs: [
            `To activate ${driverName}, an upfront payment of 70% of the monthly rate is due. Your driver starts once this is received.`,
          ],
          summary: [
            { label: 'Driver', value: driverName },
            { label: 'Upfront (70%)', value: formatNaira(amount) },
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

    return { ok: true, invoiceId: inv.id };
  } catch (err) {
    console.error('[corporate-billing] issueCorporateUpfrontInvoice failed', assignment.id, err);
    return { ok: false };
  }
}
