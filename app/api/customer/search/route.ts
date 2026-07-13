import { NextResponse } from 'next/server';
import { requireAuthUser, AuthError } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/customer/search?tier=t2&vehicle_class=sedan&language=english
 *
 * Reads from v_public_driver_summary (Slice 2). RLS on driver_profiles
 * restricts this to approved, non-suspended, non-deleted drivers with
 * tier ≥ T2 — so filtering here is just refinement, not security.
 */

export async function GET(req: Request) {
  try {
    await requireAuthUser();

    const { searchParams } = new URL(req.url);
    const tier = searchParams.get('tier'); // 't2' | 't3' | 't4'
    const vehicleClass = searchParams.get('vehicle_class'); // 'sedan' | 'suv' | ...
    const language = searchParams.get('language')?.toLowerCase();
    const query = searchParams.get('q')?.trim();

    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q = (supabase as any)
      .from('v_public_driver_summary')
      .select('*')
      .order('average_rating', { ascending: false, nullsFirst: false })
      .limit(50);

    if (tier === 't2' || tier === 't3' || tier === 't4') {
      // gte on enum text ordering works because t2 < t3 < t4 lexically
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

    // If language filter, apply post-filter (array_contains is case-sensitive)
    const results = language
      ? (data ?? []).filter((d: { languages?: string[] }) =>
          (d.languages ?? []).some((l) => l.toLowerCase() === language)
        )
      : (data ?? []);

    return NextResponse.json({ drivers: results });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.code }, { status: err.status });
    }
    console.error('[customer/search]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
