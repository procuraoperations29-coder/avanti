import { BANK_ACCOUNT, COMPANY } from '@/config/company';

/**
 * Customer-facing invoice email for an out-of-state trip quote.
 *
 * Shows ONLY the total the customer pays — never the driver payout or our
 * margin. Offers two ways to pay: the auto-reconciled Paystack link (primary)
 * and a direct bank transfer (manual reconciliation).
 */
export interface TripInvoiceEmailInput {
  customerName: string;
  tripSummary: string; // e.g. "Lagos → Ibadan · round trip · 3 days"
  amountFormatted: string; // e.g. "₦185,000"
  conditions: string | null;
  payLink: string;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function tripInvoiceEmail(input: TripInvoiceEmailInput): { subject: string; html: string } {
  const subject = `Your Avanti quote — ${input.tripSummary}`;

  const conditionsBlock = input.conditions
    ? `<tr><td style="padding:16px 0 0;font-family:sans-serif;font-size:14px;color:#475569;line-height:1.6;">
         <div style="font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;margin-bottom:6px;">Conditions</div>
         ${esc(input.conditions).replace(/\n/g, '<br/>')}
       </td></tr>`
    : '';

  const html = `
  <div style="background:#f7f9fc;padding:32px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e4e8f0;border-radius:16px;overflow:hidden;">
      <tr>
        <td style="background:#0d1122;padding:24px 28px;">
          <div style="font-family:sans-serif;font-size:18px;font-weight:700;color:#ffffff;">Avanti</div>
          <div style="font-family:sans-serif;font-size:11px;text-transform:uppercase;letter-spacing:.14em;color:#94a1c2;margin-top:4px;">Your trip quote</div>
        </td>
      </tr>
      <tr>
        <td style="padding:28px;">
          <p style="font-family:sans-serif;font-size:15px;color:#0f1629;margin:0 0 4px;">Hi ${esc(input.customerName)},</p>
          <p style="font-family:sans-serif;font-size:14px;color:#475569;line-height:1.6;margin:0 0 20px;">
            Here's the quote for your trip. Once payment is received we'll confirm your driver.
          </p>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f9fc;border:1px solid #e4e8f0;border-radius:12px;">
            <tr>
              <td style="padding:20px;">
                <div style="font-family:sans-serif;font-size:13px;color:#475569;">${esc(input.tripSummary)}</div>
                <div style="font-family:sans-serif;font-size:32px;font-weight:700;color:#0f1629;margin-top:8px;letter-spacing:-.02em;">${esc(input.amountFormatted)}</div>
                <div style="font-family:sans-serif;font-size:12px;color:#94a3b8;margin-top:4px;">Total, VAT included</div>
                ${conditionsBlock}
              </td>
            </tr>
          </table>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
            <tr>
              <td align="center">
                <a href="${esc(input.payLink)}" style="display:inline-block;background:#16bd69;color:#08111b;font-family:sans-serif;font-size:15px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:12px;">Pay securely online</a>
              </td>
            </tr>
          </table>

          <div style="font-family:sans-serif;font-size:12px;color:#94a3b8;text-align:center;margin-top:12px;">Card, bank transfer, or USSD.</div>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;border-top:1px solid #e4e8f0;">
            <tr>
              <td style="padding-top:20px;">
                <div style="font-family:sans-serif;font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;margin-bottom:8px;">Or transfer directly</div>
                <div style="font-family:sans-serif;font-size:14px;color:#0f1629;line-height:1.7;">
                  ${esc(BANK_ACCOUNT.bankName)}<br/>
                  <strong>${esc(BANK_ACCOUNT.accountNumber)}</strong><br/>
                  ${esc(BANK_ACCOUNT.accountName)}
                </div>
                <div style="font-family:sans-serif;font-size:12px;color:#94a3b8;margin-top:8px;">If you transfer, reply to this email with your proof of payment so we can confirm.</div>
              </td>
            </tr>
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
