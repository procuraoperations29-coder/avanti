import { NextResponse } from 'next/server';
import { withAuth, requirePermissions } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { signedDocumentUrl } from '@/lib/storage/upload';

/**
 * GET /api/admin/verification/queue
 *
 * Returns the pending-verification queue. Reads from the v_verification_queue
 * view created in Slice 2 — filters to submitted/under_review/more_info_needed.
 */
export const GET = withAuth(requirePermissions('verification.queue.read'), async () => {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('v_verification_queue')
    .select('*')
    .order('submitted_at', { ascending: true, nullsFirst: false });
  if (error) {
    return NextResponse.json({ error: 'queue_read_failed', message: error.message }, { status: 500 });
  }
  return NextResponse.json({ items: data ?? [] });
});

/**
 * Helper — used by the /admin/verification/[driverId] page to render the
 * full submission with signed URLs for every uploaded document.
 */
export async function fetchDriverForReview(driverId: string) {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase as any)
    .from('driver_profiles')
    .select(
      'id, user_id, verification_tier, verification_status, onboarding_state, onboarding_submitted_at, years_experience, languages, vehicle_class_experience, transmission_experience, bio, service_radius_km, users:user_id(full_name, phone, email, country_code)'
    )
    .eq('id', driverId)
    .single();

  if (!profile) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: documents } = await (supabase as any)
    .from('documents')
    .select('id, kind, filename, mime_type, size_bytes, storage_path, uploaded_at')
    .eq('owner_user_id', profile.user_id)
    .eq('is_active', true)
    .order('uploaded_at', { ascending: false });

  const documentsWithUrls = await Promise.all(
    (documents ?? []).map(async (d: { storage_path: string } & Record<string, unknown>) => ({
      ...d,
      previewUrl: await signedDocumentUrl(d.storage_path),
    }))
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: events } = await (supabase as any)
    .from('verification_events')
    .select('id, event_type, from_tier, to_tier, actor_user_id, rationale, created_at')
    .eq('driver_id', driverId)
    .order('created_at', { ascending: false });

  return {
    profile,
    documents: documentsWithUrls,
    events: events ?? [],
  };
}
