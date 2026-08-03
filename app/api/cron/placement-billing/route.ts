import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { serverEnv } from '@/config/env';
import { runPlacementBillingCycle } from '@/lib/permanent/billing';
import { runCorporateMonthlyBilling } from '@/lib/corporate/billing';

/**
 * Daily recurring-billing cron (placements + corporate).
 *
 * Vercel Cron hits this (see vercel.json). When CRON_SECRET is set, Vercel
 * sends `Authorization: Bearer <CRON_SECRET>`; we reject anything else so the
 * endpoint can't be triggered by outsiders. It generates the month's placement
 * invoices + reminders 2 days before each placement's billing day, and flips
 * past-due invoices to overdue. Idempotent — safe to run more than once a day.
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
    const placement = await runPlacementBillingCycle(admin, now);
    const corporate = await runCorporateMonthlyBilling(admin, now);
    return NextResponse.json({ ok: true, placement, corporate });
  } catch (err) {
    console.error('[cron placement-billing]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
