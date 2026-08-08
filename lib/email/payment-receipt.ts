import 'server-only';
import { COMPANY } from '@/config/company';
import { sendEmail } from '@/lib/email/resend';
import { brandedEmail } from '@/lib/email/templates/branded';
import { sendPushToUser } from '@/lib/push/send';

/**
 * "Payment received" confirmation for the flows that aren't on-demand
 * engagements (out-of-state trips, permanent-placement invoices). Sends the
 * customer a receipt and pings the Avanti ops inbox. Never throws.
 */
function opsEmail(): string {
  return process.env.AVANTI_OPS_EMAIL || COMPANY.supportEmail;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function sendPaymentReceipt(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  input: {
    customerUserId: string;
    eyebrow: string;
    customerHeadline: string;
    customerParagraphs: string[];
    opsHeadline: string;
    summary: { label: string; value: string }[];
    pushUrl?: string;
  }
): Promise<void> {
  try {
    const { data: customer } = await admin
      .from('users')
      .select('full_name, email')
      .eq('id', input.customerUserId)
      .single();
    const customerName = customer?.full_name ?? 'there';

    if (customer?.email) {
      await sendEmail({
        to: customer.email,
        subject: 'Payment received — Avanti',
        html: brandedEmail({
          eyebrow: input.eyebrow,
          greeting: `Hi ${customerName},`,
          headline: input.customerHeadline,
          paragraphs: input.customerParagraphs,
          summary: input.summary,
        }),
      });
    }

    await sendEmail({
      to: opsEmail(),
      subject: `${input.opsHeadline} — ${customerName}`,
      html: brandedEmail({
        eyebrow: 'Payment received',
        headline: input.opsHeadline,
        paragraphs: ['A customer payment has been confirmed.'],
        summary: [{ label: 'Customer', value: customerName }, ...input.summary],
      }),
    });

    // Push to the customer (no-op if push isn't configured).
    await sendPushToUser(admin, input.customerUserId, {
      title: input.customerHeadline,
      body: input.customerParagraphs[0] ?? 'Payment received.',
      url: input.pushUrl ?? '/customer/engagements',
    });
  } catch (err) {
    console.error('[payment-receipt] failed', input.customerUserId, err);
  }
}
