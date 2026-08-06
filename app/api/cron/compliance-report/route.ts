import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { serverEnv } from '@/config/env';
import { sendEmail } from '@/lib/email/resend';
import { brandedEmail } from '@/lib/email/templates/branded';
import { computeComplianceSummary } from '@/lib/compliance/report';

const OPS_EMAIL = 'hello@avanti.com.ng';

/**
 * Monthly compliance report cron. Compiles the previous calendar month's
 * compliance summary and emails it to ops. Secured by CRON_SECRET (vercel.json,
 * scheduled for the 1st of each month).
 */
export async function GET(req: Request) {
  const env = serverEnv();
  if (env.CRON_SECRET) {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
  }

  try {
    const admin = createServiceRoleClient();
    const now = new Date();
    const until = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const since = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
    const s = await computeComplianceSummary(admin, since, until);
    const monthLabel = since.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

    const html = brandedEmail({
      eyebrow: 'Compliance report',
      greeting: 'Hi team,',
      headline: `Compliance summary — ${monthLabel}`,
      paragraphs: ['Automated monthly compliance snapshot. Review anything flagged below in the admin console.'],
      summary: [
        { label: 'New users', value: String(s.newUsers) },
        { label: 'Engagements completed', value: String(s.engagementsCompleted) },
        { label: 'Disputes opened', value: String(s.disputesOpened) },
        { label: 'Disputes resolved', value: String(s.disputesResolved) },
        { label: 'Data requests received', value: String(s.dataRequestsReceived) },
        { label: 'Data requests overdue', value: String(s.dataRequestsOverdue) },
        { label: 'Sanctions hits', value: String(s.sanctionsHits) },
        { label: 'Sanctions re-checks due', value: String(s.sanctionsNeedsReview) },
        { label: 'Audit events', value: String(s.auditEvents) },
      ],
      cta: { label: 'Open compliance console', url: 'https://www.avanti.com.ng/admin/compliance' },
    });

    let emailed = false;
    try {
      await sendEmail({ to: OPS_EMAIL, subject: `Avanti compliance report — ${monthLabel}`, html });
      emailed = true;
    } catch (err) {
      console.error('[cron compliance-report] email failed', err);
    }

    return NextResponse.json({ ok: true, emailed, summary: s });
  } catch (err) {
    console.error('[cron compliance-report]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
