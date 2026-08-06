import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { serverEnv } from '@/config/env';

/**
 * Daily sanctions re-check cron. Flags any 'clear' screening whose
 * next_check_due has passed as 'needs_review', so compliance re-screens it.
 * Secured by CRON_SECRET (see vercel.json).
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
    const nowIso = new Date().toISOString();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (admin as any)
      .from('sanctions_checks')
      .update({ status: 'needs_review', updated_at: nowIso })
      .eq('status', 'clear')
      .lte('next_check_due', nowIso)
      .select('id');
    if (error) {
      console.error('[cron sanctions-recheck]', error.message);
      return NextResponse.json({ error: 'update_failed', message: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, flagged: (data ?? []).length });
  } catch (err) {
    console.error('[cron sanctions-recheck]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
