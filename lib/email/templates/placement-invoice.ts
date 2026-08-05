import { BANK_ACCOUNT, COMPANY } from '@/config/company';

/**
 * Customer-facing invoice / reminder email for a permanent placement payment.
 * Paid to AVANTI (not the driver). Used for the 70% upfront, each monthly
 * salary invoice, and the 2-days-before reminder.
 */
export interface PlacementInvoiceEmailInput {
  customerName: string;
  driverName: string;
  kind: 'upfront' | 'monthly';
  periodLabel: string | null; // e.g. "September 2026" (monthly) or null (upfront)
  amountFormatted: string;
  dueDateFormatted: string;
  payLink: string;
  isReminder: boolean;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function placementInvoiceEmail(input: PlacementInvoiceEmailInput): { subject: string; html: string } {
  const what =
    input.kind === 'upfront'
      ? `Upfront payment to start your placement with ${input.driverName}`
      : `${input.periodLabel ?? 'Monthly'} salary for your driver ${input.driverName}`;

  const subject = input.isReminder
    ? `Reminder: ${input.amountFormatted} due ${input.dueDateFormatted} — Avanti placement`
    : input.kind === 'upfront'
      ? `Secure your placement — ${input.amountFormatted} due`
      : `Your Avanti placement invoice — ${input.periodLabel ?? ''}`.trim();

  const lead = input.isReminder
    ? `This is a friendly reminder that your placement payment is due on <strong>${esc(input.dueDateFormatted)}</strong>.`
    : input.kind === 'upfront'
      ? `To confirm and start your placement, an upfront payment is due. Your driver begins once this is received.`
      : `Here's your placement invoice for ${esc(input.periodLabel ?? 'this month')}, due <strong>${esc(input.dueDateFormatted)}</strong>.`;

  const html = `
  <div style="background:#f7f9fc;padding:32px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e4e8f0;border-radius:16px;overflow:hidden;">
      <tr>
        <td style="background:#0d1122;padding:24px 28px;">
          <div style="font-family:sans-serif;font-size:18px;font-weight:700;color:#ffffff;">Avanti</div>
          <div style="font-family:sans-serif;font-size:11px;text-transform:uppercase;letter-spacing:.14em;color:#94a1c2;margin-top:4px;">Permanent placement</div>
        </td>
      </tr>
      <tr>
        <td style="padding:28px;">
          <p style="font-family:sans-serif;font-size:15px;color:#0f1629;margin:0 0 4px;">Hi ${esc(input.customerName)},</p>
          <p style="font-family:sans-serif;font-size:14px;color:#475569;line-height:1.6;margin:0 0 20px;">${lead}</p>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f9fc;border:1px solid #e4e8f0;border-radius:12px;">
            <tr>
              <td style="padding:20px;">
                <div style="font-family:sans-serif;font-size:13px;color:#475569;">${esc(what)}</div>
                <div style="font-family:sans-serif;font-size:32px;font-weight:700;color:#0f1629;margin-top:8px;letter-spacing:-.02em;">${esc(input.amountFormatted)}</div>
                <div style="font-family:sans-serif;font-size:12px;color:#94a3b8;margin-top:4px;">Due ${esc(input.dueDateFormatted)} · paid to Avanti${input.kind === 'upfront' ? ' · incl. 7.5% VAT' : ''}</div>
              </td>
            </tr>
          </table>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
            <tr><td align="center">
              <a href="${esc(input.payLink)}" style="display:inline-block;background:#16bd69;color:#08111b;font-family:sans-serif;font-size:15px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:12px;">Pay securely online</a>
            </td></tr>
          </table>
          <div style="font-family:sans-serif;font-size:12px;color:#94a3b8;text-align:center;margin-top:12px;">Card, bank transfer, or USSD.</div>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;border-top:1px solid #e4e8f0;">
            <tr><td style="padding-top:20px;">
              <div style="font-family:sans-serif;font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;margin-bottom:8px;">Or transfer directly</div>
              <div style="font-family:sans-serif;font-size:14px;color:#0f1629;line-height:1.7;">
                ${esc(BANK_ACCOUNT.bankName)}<br/>
                <strong>${esc(BANK_ACCOUNT.accountNumber)}</strong><br/>
                ${esc(BANK_ACCOUNT.accountName)}
              </div>
              <div style="font-family:sans-serif;font-size:12px;color:#94a3b8;margin-top:8px;">Pay Avanti — not the driver directly. Reply with proof of transfer so we can confirm.</div>
            </td></tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:20px 28px;background:#f7f9fc;border-top:1px solid #e4e8f0;">
          <div style="font-family:sans-serif;font-size:12px;color:#94a3b8;">${esc(COMPANY.legalName)} · Questions? Just reply to this email.</div>
        </td>
      </tr>
    </table>
  </div>`;

  return { subject, html };
}
