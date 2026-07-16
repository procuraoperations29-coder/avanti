import { NextResponse } from 'next/server';
import { withAuth, requirePermissions } from '@/lib/auth';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';

/**
 * GET /api/admin/verification/queue
 *
 * Returns the pending-verification queue.
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
 * fetchDriverForReview — used by the /admin/verification/[driverId] page.
 *
 * Only queries columns that actually exist on driver_profiles. Everything
 * about the driver's onboarding lives in onboarding_state (jsonb) — the
 * page reads from there, not from columns that were never populated.
 */
export async function fetchDriverForReview(driverId: string) {
  const supabase = await createClient();
  const admin = createServiceRoleClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase as any)
    .from('driver_profiles')
    .select(
      'id, user_id, verification_tier, verification_status, onboarding_state, onboarding_submitted_at, available_on_demand, available_permanent, users:user_id(full_name, phone, email, country_code)'
    )
    .eq('id', driverId)
    .single();

  if (!profile) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: documents } = await (supabase as any)
    .from('documents')
    .select(
      'id, document_type, mime_type, file_size_bytes, storage_bucket, storage_path, reference_number, expiry_date, metadata, created_at'
    )
    .eq('owner_user_id', profile.user_id)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  // Generate a signed URL for each document using the bucket stored on the row
  const documentsWithUrls = await Promise.all(
    (documents ?? []).map(async (d: {
      id: string;
      document_type: string;
      mime_type: string | null;
      file_size_bytes: number | null;
      storage_bucket: string;
      storage_path: string;
      reference_number: string | null;
      expiry_date: string | null;
      metadata: Record<string, unknown>;
      created_at: string;
    }) => {
      let previewUrl: string | null = null;
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: signed } = await (admin as any).storage
          .from(d.storage_bucket || 'driver-documents')
          .createSignedUrl(d.storage_path, 60 * 60); // 1 hour
        previewUrl = signed?.signedUrl ?? null;
      } catch (err) {
        console.error('[fetchDriverForReview] signed url failed for', d.storage_path, err);
      }

      const filename = d.storage_path.split('/').pop() ?? d.storage_path;

      return {
        id: d.id,
        document_type: d.document_type,
        mime_type: d.mime_type ?? 'application/octet-stream',
        file_size_bytes: d.file_size_bytes,
        reference_number: d.reference_number,
        expiry_date: d.expiry_date,
        metadata: d.metadata ?? {},
        created_at: d.created_at,
        filename,
        previewUrl,
      };
    })
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
