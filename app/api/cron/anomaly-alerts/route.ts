import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { serverEnv } from '@/config/env';
import { sendEmail } from '@/lib/email/resend';
import { brandedEmail } from '@/lib/email/templates/branded';
import { detectAnomalies } from '@/lib/analytics/anomalies';

const OPS_EMAIL = 'hello@avanti.com.ng';

/**
 * Daily anomaly-alert cron. Emails ops only when there's something actionable
 * (a high/medium anomaly). Secured by CRON_SECRET (see vercel.json).
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
    const alerts = await detectAnomalies(admin);
    const actionable = alerts.filter((a) => a.severity !== 'info');
    if (actionable.length === 0) return NextResponse.json({ ok: true, alerts: alerts.length, emailed: false });

    const html = brandedEmail({
      eyebrow: 'Anomaly alert',
      greeting: 'Hi team,',
      headline: `${actionable.length} thing${actionable.length === 1 ? '' : 's'} to look at`,
      paragraphs: ['The daily monitor flagged the following. Open the analytics console for detail.'],
      summary: actionable.map((a) => ({ label: `${a.severity.toUpperCase()} · ${a.title}`, value: a.detail })),
      cta: { label: 'Open analytics', url: 'https://www.avanti.com.ng/admin/analytics' },
    });

    let emailed = false;
    try {
      await sendEmail({ to: OPS_EMAIL, subject: `Avanti alert — ${actionable.length} item${actionable.length === 1 ? '' : 's'} need attention`, html });
      emailed = true;
    } catch (err) {
      console.error('[cron anomaly-alerts] email failed', err);
    }
    return NextResponse.json({ ok: true, alerts: alerts.length, actionable: actionable.length, emailed });
  } catch (err) {
    console.error('[cron anomaly-alerts]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
