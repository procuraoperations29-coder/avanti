import 'server-only';
import { publicEnv } from '@/config/env';
import { COMPANY } from '@/config/company';
import { sendEmail } from '@/lib/email/resend';
import { brandedEmail } from '@/lib/email/templates/branded';

/**
 * Lifecycle email notifications for on-demand engagements. One entry point —
 * every hook (payment webhook, driver transition, customer confirm) calls
 * notifyEngagementEvent(); it loads the parties and emails the customer and
 * the Avanti ops inbox. Never throws: notification failure must not break the
 * underlying action.
 */
export type EngagementEvent =
  | 'payment_confirmed'
  | 'driver_on_way'
  | 'driver_completed'
  | 'customer_confirmed';

function opsEmail(): string {
  return process.env.AVANTI_OPS_EMAIL || COMPANY.supportEmail;
}
function formatNaira(n: number): string {
  return `₦${Math.round(n).toLocaleString('en-NG')}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function notifyEngagementEvent(admin: any, engagementId: string, event: EngagementEvent): Promise<void> {
  try {
    const { data: eng } = await admin
      .from('engagements')
      .select('id, status, engagement_type, starts_at, currency, customer_price_total, customer_user_id, driver_id')
      .eq('id', engagementId)
      .single();
    if (!eng) return;

    const { data: customer } = await admin
      .from('users')
      .select('full_name, email')
      .eq('id', eng.customer_user_id)
      .single();

    let driverName = 'your driver';
    if (eng.driver_id) {
      const { data: dp } = await admin.from('driver_profiles').select('user_id').eq('id', eng.driver_id).single();
      if (dp?.user_id) {
        const { data: du } = await admin.from('users').select('full_name').eq('id', dp.user_id).single();
        driverName = du?.full_name ?? 'your driver';
      }
    }

    const customerName = customer?.full_name ?? 'there';
    const type = String(eng.engagement_type ?? '').replace(/_/g, ' ');
    const when = eng.starts_at
      ? new Date(eng.starts_at).toLocaleString('en-GB', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '—';
    const total =
      eng.currency === 'NGN'
        ? formatNaira(Number(eng.customer_price_total ?? 0))
        : `${eng.currency} ${eng.customer_price_total ?? 0}`;
    const link = `${publicEnv.NEXT_PUBLIC_APP_URL ?? ''}/customer/engagements/${eng.id}`;

    const baseSummary = [
      { label: 'Driver', value: driverName },
      { label: 'Type', value: type },
      { label: 'When', value: when },
    ];
    const opsSummary = [{ label: 'Customer', value: customerName }, ...baseSummary];

    let customerSubject: string | null = null;
    let customerHtml = '';
    let opsSubject: string | null = null;
    let opsHtml = '';

    switch (event) {
      case 'payment_confirmed':
        customerSubject = 'Your Avanti booking is confirmed';
        customerHtml = brandedEmail({
          eyebrow: 'Booking confirmed',
          greeting: `Hi ${customerName},`,
          headline: 'Your booking is confirmed',
          paragraphs: [
            `We've received your payment and confirmed your booking with ${driverName}.`,
            'Your driver will be there at the start time. You can view the details any time.',
          ],
          summary: [...baseSummary, { label: 'Total', value: total }],
          cta: { label: 'View booking', url: link },
        });
        opsSubject = `Booking confirmed & paid — ${customerName}`;
        opsHtml = brandedEmail({
          eyebrow: 'Payment received',
          headline: 'A booking has been paid & confirmed',
          paragraphs: ['A customer payment was confirmed and the engagement is now confirmed.'],
          summary: [...opsSummary, { label: 'Total', value: total }],
        });
        break;

      case 'driver_on_way':
        customerSubject = `${driverName} is on the way`;
        customerHtml = brandedEmail({
          eyebrow: 'On the way',
          greeting: `Hi ${customerName},`,
          headline: `${driverName} is on the way`,
          paragraphs: [`${driverName} has set out and will arrive at your pickup at the start time.`],
          summary: baseSummary,
          cta: { label: 'View booking', url: link },
        });
        opsSubject = `Driver en route — ${customerName}`;
        opsHtml = brandedEmail({
          eyebrow: 'Driver en route',
          headline: 'Driver marked "on the way"',
          paragraphs: [`${driverName} has started the engagement.`],
          summary: opsSummary,
        });
        break;

      case 'driver_completed':
        customerSubject = 'Your engagement is complete — please confirm';
        customerHtml = brandedEmail({
          eyebrow: 'Completed',
          greeting: `Hi ${customerName},`,
          headline: 'Your engagement is complete',
          paragraphs: [
            `${driverName} has marked this engagement complete.`,
            'Please confirm on your end so we know everything went well.',
          ],
          summary: baseSummary,
          cta: { label: 'Confirm completion', url: link },
        });
        opsSubject = `Driver marked complete — ${customerName}`;
        opsHtml = brandedEmail({
          eyebrow: 'Driver completed',
          headline: 'Driver marked the engagement complete',
          paragraphs: ['Awaiting the customer to confirm on their end.'],
          summary: opsSummary,
        });
        break;

      case 'customer_confirmed':
        opsSubject = `Customer confirmed the job is done — ${customerName}`;
        opsHtml = brandedEmail({
          eyebrow: 'Confirmed by customer',
          headline: 'Customer confirmed the job is done',
          paragraphs: [`${customerName} has confirmed the engagement with ${driverName} is complete.`],
          summary: [...opsSummary, { label: 'Total', value: total }],
        });
        customerSubject = 'Thanks for confirming';
        customerHtml = brandedEmail({
          eyebrow: 'Thank you',
          greeting: `Hi ${customerName},`,
          headline: 'Thanks for confirming',
          paragraphs: [`Thanks for confirming your engagement with ${driverName}. We hope it went well.`],
        });
        break;
    }

    if (customerSubject && customer?.email) {
      await sendEmail({ to: customer.email, subject: customerSubject, html: customerHtml });
    }
    if (opsSubject) {
      await sendEmail({ to: opsEmail(), subject: opsSubject, html: opsHtml });
    }
  } catch (err) {
    console.error('[engagement-notify] failed', engagementId, event, err);
  }
}
