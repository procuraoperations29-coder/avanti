import { COMPANY } from '@/config/company';

/**
 * Generic branded transactional email — used for lifecycle notifications
 * (payment confirmed, driver on the way, completion, etc.) to both customers
 * and the Avanti ops inbox. Keep content in the caller; this is just chrome.
 */
export interface BrandedEmailInput {
  eyebrow: string; // small uppercase label under the logo
  headline: string;
  greeting?: string; // "Hi Ada,"
  paragraphs: string[];
  summary?: { label: string; value: string }[];
  cta?: { label: string; url: string };
  footerNote?: string;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function brandedEmail(input: BrandedEmailInput): string {
  const greeting = input.greeting
    ? `<p style="font-family:sans-serif;font-size:15px;color:#0f1629;margin:0 0 12px;">${esc(input.greeting)}</p>`
    : '';

  const paragraphs = input.paragraphs
    .map(
      (p) =>
        `<p style="font-family:sans-serif;font-size:14px;color:#475569;line-height:1.6;margin:0 0 14px;">${esc(p)}</p>`
    )
    .join('');

  const summary = input.summary?.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f9fc;border:1px solid #e4e8f0;border-radius:12px;margin:4px 0 20px;">
         <tr><td style="padding:16px 18px;">
           ${input.summary
             .map(
               (r) =>
                 `<div style="font-family:sans-serif;font-size:13px;color:#0f1629;line-height:1.9;"><span style="color:#94a3b8;">${esc(r.label)}:</span> ${esc(r.value)}</div>`
             )
             .join('')}
         </td></tr>
       </table>`
    : '';

  const cta = input.cta
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 8px;">
         <tr><td align="center">
           <a href="${esc(input.cta.url)}" style="display:inline-block;background:#16bd69;color:#08111b;font-family:sans-serif;font-size:15px;font-weight:600;text-decoration:none;padding:13px 30px;border-radius:12px;">${esc(input.cta.label)}</a>
         </td></tr>
       </table>`
    : '';

  const footerNote = input.footerNote
    ? `<p style="font-family:sans-serif;font-size:12px;color:#94a3b8;line-height:1.6;margin:16px 0 0;">${esc(input.footerNote)}</p>`
    : '';

  return `
  <div style="background:#f7f9fc;padding:32px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e4e8f0;border-radius:16px;overflow:hidden;">
      <tr>
        <td style="background:#0d1122;padding:22px 28px;">
          <div style="font-family:sans-serif;font-size:18px;font-weight:700;color:#ffffff;">Avanti</div>
          <div style="font-family:sans-serif;font-size:11px;text-transform:uppercase;letter-spacing:.14em;color:#94a1c2;margin-top:4px;">${esc(input.eyebrow)}</div>
        </td>
      </tr>
      <tr>
        <td style="padding:28px;">
          ${greeting}
          <h1 style="font-family:sans-serif;font-size:20px;font-weight:700;color:#0f1629;margin:0 0 14px;letter-spacing:-.01em;">${esc(input.headline)}</h1>
          ${paragraphs}
          ${summary}
          ${cta}
          ${footerNote}
        </td>
      </tr>
      <tr>
        <td style="padding:18px 28px;background:#f7f9fc;border-top:1px solid #e4e8f0;">
          <div style="font-family:sans-serif;font-size:12px;color:#94a3b8;">${esc(COMPANY.legalName)}</div>
        </td>
      </tr>
    </table>
  </div>`;
}
