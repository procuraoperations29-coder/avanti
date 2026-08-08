import { NextResponse } from 'next/server';
import { requireAuthUser, AuthError } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { getDriverSelfieUrls } from '@/lib/storage/upload';

/**
 * GET /api/customer/search
 *
 * Reads from v_public_driver_summary. RLS restricts to approved,
 * non-suspended, non-deleted drivers with tier ≥ T2.
 *
 * v_public_driver_summary is a view — Supabase's generated types may or
 * may not include it depending on the CLI version. If typing complains,
 * that's the signal to add it via `supabase gen types` on the DB with
 * the view present, or explicitly type the result.
 */

export async function GET(req: Request) {
  try {
    await requireAuthUser();

    const { searchParams } = new URL(req.url);
    const tier = searchParams.get('tier');
    const vehicleClass = searchParams.get('vehicle_class');
    const language = searchParams.get('language')?.toLowerCase();
    const query = searchParams.get('q')?.trim();

    const supabase = await createClient();
    let q = supabase
      .from('v_public_driver_summary')
      .select('*')
      .order('average_rating', { ascending: false, nullsFirst: false })
      .limit(50);

    if (tier === 't2' || tier === 't3' || tier === 't4') {
      q = q.gte('verification_tier', tier);
    }
    if (vehicleClass) {
      q = q.contains('vehicle_class_experience', [vehicleClass]);
    }
    if (query) {
      q = q.ilike('full_name', `%${query}%`);
    }

    const { data, error } = await q;
    if (error) {
      return NextResponse.json({ error: 'search_failed', message: error.message }, { status: 500 });
    }

    const results = language
      ? (data ?? []).filter((d) =>
          (d.languages ?? []).some((l: string) => l.toLowerCase() === language)
        )
      : (data ?? []);

    // Attach each driver's selfie (signed URL) for the card portrait.
    const userIds = results.map((d) => d.user_id).filter((id): id is string => Boolean(id));
    const selfieByUser = await getDriverSelfieUrls(userIds);
    const withPhotos = results.map((d) => ({
      ...d,
      selfie_url: d.user_id ? selfieByUser[d.user_id] ?? null : null,
    }));

    return NextResponse.json({ drivers: withPhotos });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.code }, { status: err.status });
    }
    console.error('[customer/search]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
