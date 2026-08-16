import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthUser } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';

const bodySchema = z.object({
  path: z.string().min(1).max(512),
  referrer: z.string().max(1024).optional().nullable(),
  utmSource: z.string().max(200).optional().nullable(),
  utmMedium: z.string().max(200).optional().nullable(),
  utmCampaign: z.string().max(200).optional().nullable(),
  visitorId: z.string().max(64).optional().nullable(),
});

function hostOf(url: string | null | undefined): string | null {
  if (!url) return null;
  try { return new URL(url).host || null; } catch { return null; }
}

/**
 * POST /api/track/pageview — first-party page-view beacon. Anonymous-friendly.
 * Skips /admin paths (internal). Best-effort: always returns ok.
 */
export async function POST(req: Request) {
  try {
    let body: z.infer<typeof bodySchema>;
    try {
      body = bodySchema.parse(await req.json());
    } catch {
      return NextResponse.json({ ok: false }, { status: 200 });
    }

    // Don't record internal admin browsing or api calls.
    if (body.path.startsWith('/admin') || body.path.startsWith('/api')) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    let userId: string | null = null;
    try {
      const user = await getAuthUser();
      userId = user?.id ?? null;
    } catch { /* anonymous */ }

    const admin = createServiceRoleClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any).from('page_views').insert({
      path: body.path.slice(0, 512),
      referrer: body.referrer || null,
      referrer_host: hostOf(body.referrer),
      utm_source: body.utmSource || null,
      utm_medium: body.utmMedium || null,
      utm_campaign: body.utmCampaign || null,
      visitor_id: body.visitorId || null,
      user_id: userId,
      is_signed_in: Boolean(userId),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[track pageview]', err);
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
