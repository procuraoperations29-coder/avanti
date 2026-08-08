import 'server-only';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { createHash } from 'crypto';

/**
 * Server-side helper for uploading driver documents to Supabase Storage and
 * creating the matching `documents` row.
 *
 * Path convention: driver-documents/{user_id}/{kind}/{timestamp}-{filename}
 * The `documents` table stores the bucket and the path SEPARATELY
 * (storage_bucket + storage_path, path WITHOUT the bucket prefix) — that's what
 * createSignedUrl(bucket).createSignedUrl(path) expects.
 */

export interface UploadDocumentInput {
  userId: string;
  kind: string; // UI document kind (mapped to the document_type enum below)
  file: File | Blob;
  filename: string;
  mimeType: string;
}

export interface UploadDocumentResult {
  documentId: string;
  storageBucket: string;
  storagePath: string;
  contentHash: string;
  sizeBytes: number;
}

const BUCKET = 'driver-documents';

// The onboarding UI uses friendlier kind names than the DB's document_type enum
// (driver_licence_front/back, utility_bill, vehicle_insurance, medical_note, …).
// Map UI kind → a valid document_type; keep the original in metadata.
const KIND_TO_DOCTYPE: Record<string, string> = {
  national_id: 'national_id',
  passport: 'passport',
  voter_card: 'voter_card',
  // Onboarding UI kinds (see /api/driver/onboarding/upload)
  id_front: 'national_id',
  id_back: 'national_id',
  licence_front: 'driver_licence_front',
  licence_back: 'driver_licence_back',
  address_proof: 'utility_bill',
  drivers_licence: 'driver_licence_front',
  driver_licence_front: 'driver_licence_front',
  driver_licence_back: 'driver_licence_back',
  proof_of_address: 'utility_bill',
  utility_bill: 'utility_bill',
  bank_statement: 'bank_statement',
  selfie: 'selfie',
  insurance_certificate: 'vehicle_insurance',
  vehicle_insurance: 'vehicle_insurance',
  vehicle_registration: 'other',
  medical_certificate: 'medical_note',
  medical_note: 'medical_note',
  background_check_result: 'background_check_result',
  reference_letter: 'reference_letter',
  defensive_driving_cert: 'other',
  executive_protection_cert: 'other',
  other: 'other',
};

function toDocumentType(kind: string): string {
  return KIND_TO_DOCTYPE[kind] ?? 'other';
}

export async function uploadDriverDocument(input: UploadDocumentInput): Promise<UploadDocumentResult> {
  const buffer = Buffer.from(await input.file.arrayBuffer());
  const contentHash = createHash('sha256').update(buffer).digest('hex');
  const timestamp = Date.now();
  const safeFilename = input.filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100);
  const storagePath = `${input.userId}/${input.kind}/${timestamp}-${safeFilename}`;

  const admin = createServiceRoleClient();

  const { error: uploadError } = await admin.storage.from(BUCKET).upload(storagePath, buffer, {
    contentType: input.mimeType,
    upsert: false,
  });
  if (uploadError) {
    throw new Error(`Storage upload failed: ${uploadError.message}`);
  }

  // Replacing a document of the same kind: retire the previous active rows so
  // the admin review + driver list show only the latest upload.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin as any)
    .from('documents')
    .update({ is_active: false })
    .eq('owner_user_id', input.userId)
    .eq('is_active', true)
    .eq('metadata->>kind', input.kind)
    .then(() => {}, () => {});

  // Create the documents row — columns match the real schema.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: doc, error: insertError } = await (admin as any)
    .from('documents')
    .insert({
      owner_user_id: input.userId,
      document_type: toDocumentType(input.kind),
      storage_bucket: BUCKET,
      storage_path: storagePath,
      mime_type: input.mimeType,
      file_size_bytes: buffer.length,
      sha256: contentHash,
      metadata: { kind: input.kind, filename: input.filename },
      is_active: true,
    })
    .select('id')
    .single();

  if (insertError || !doc) {
    // Rollback: delete the storage object.
    await admin.storage.from(BUCKET).remove([storagePath]).catch(() => {});
    throw new Error(`documents insert failed: ${insertError?.message ?? 'unknown'}`);
  }

  return { documentId: doc.id, storageBucket: BUCKET, storagePath, contentHash, sizeBytes: buffer.length };
}

/**
 * The driver's most recent selfie as a short-lived signed URL, or null.
 * Used on driver profiles (admin review + the customer picking flow).
 */
export async function getDriverSelfieUrl(
  driverUserId: string,
  expiresInSeconds = 3600
): Promise<string | null> {
  const admin = createServiceRoleClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (admin as any)
    .from('documents')
    .select('storage_bucket, storage_path')
    .eq('owner_user_id', driverUserId)
    .eq('document_type', 'selfie')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  return signedDocumentUrl(data.storage_bucket, data.storage_path, expiresInSeconds);
}

/**
 * Selfie URLs for many drivers at once (list/roster views). Returns a map of
 * driver user_id → signed URL (only for drivers that have a selfie).
 */
export async function getDriverSelfieUrls(
  driverUserIds: string[],
  expiresInSeconds = 3600
): Promise<Record<string, string>> {
  if (driverUserIds.length === 0) return {};
  const admin = createServiceRoleClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (admin as any)
    .from('documents')
    .select('owner_user_id, storage_bucket, storage_path, created_at')
    .in('owner_user_id', driverUserIds)
    .eq('document_type', 'selfie')
    .eq('is_active', true)
    .order('created_at', { ascending: false });
  const rows = (data ?? []) as Array<{ owner_user_id: string; storage_bucket: string; storage_path: string }>;
  // Rows are newest-first; keep the first (latest) selfie per driver.
  const latestByUser = new Map<string, { storage_bucket: string; storage_path: string }>();
  for (const r of rows) {
    if (!latestByUser.has(r.owner_user_id)) latestByUser.set(r.owner_user_id, r);
  }
  const out: Record<string, string> = {};
  await Promise.all(
    Array.from(latestByUser.entries()).map(async ([userId, r]) => {
      const url = await signedDocumentUrl(r.storage_bucket, r.storage_path, expiresInSeconds);
      if (url) out[userId] = url;
    })
  );
  return out;
}

/**
 * Reduce a stored reference to a real storage path (no bucket, no host).
 * Tolerates legacy rows that stored a full Supabase signed/public URL or a
 * "bucket/path" value in storage_path — that mismatch is why documents for
 * drivers onboarded before the fix wouldn't render. Returns null for an
 * unparseable http URL.
 */
export function cleanStoragePath(value: string, bucket: string): string | null {
  if (!value) return null;
  for (const marker of [`/object/sign/${bucket}/`, `/object/public/${bucket}/`]) {
    const i = value.indexOf(marker);
    if (i >= 0) {
      let p = value.slice(i + marker.length);
      const q = p.indexOf('?');
      if (q >= 0) p = p.slice(0, q);
      try { return decodeURIComponent(p); } catch { return p; }
    }
  }
  if (value.startsWith(`${bucket}/`)) return value.slice(bucket.length + 1);
  if (value.startsWith('http')) return null;
  return value;
}

/**
 * Short-lived signed URL for viewing/downloading a document. Pass the stored
 * storage_bucket + storage_path.
 */
export async function signedDocumentUrl(
  bucket: string,
  path: string,
  expiresInSeconds = 3600
): Promise<string | null> {
  const admin = createServiceRoleClient();
  const b = bucket || BUCKET;
  const cleanPath = cleanStoragePath(path, b);
  if (!cleanPath) return null;
  const { data, error } = await admin.storage.from(b).createSignedUrl(cleanPath, expiresInSeconds);
  if (error || !data) return null;
  return data.signedUrl;
}
