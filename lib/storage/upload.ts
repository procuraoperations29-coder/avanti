import 'server-only';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { createHash } from 'crypto';

/**
 * Server-side helper for uploading driver documents to Supabase Storage
 * and creating the matching `documents` row.
 *
 * Path convention: driver-documents/{user_id}/{kind}/{timestamp}-{filename}
 * — matches the RLS policies in the storage migration.
 */

export interface UploadDocumentInput {
  userId: string;
  kind: string; // document_kind enum value
  file: File | Blob;
  filename: string;
  mimeType: string;
}

export interface UploadDocumentResult {
  documentId: string;
  storagePath: string;
  contentHash: string;
  sizeBytes: number;
}

const BUCKET = 'driver-documents';

export async function uploadDriverDocument(
  input: UploadDocumentInput
): Promise<UploadDocumentResult> {
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

  // Create the documents row
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: doc, error: insertError } = await (admin as any)
    .from('documents')
    .insert({
      owner_user_id: input.userId,
      kind: input.kind,
      storage_path: `${BUCKET}/${storagePath}`,
      filename: input.filename,
      mime_type: input.mimeType,
      size_bytes: buffer.length,
      content_hash: contentHash,
      is_active: true,
    })
    .select('id')
    .single();

  if (insertError || !doc) {
    // Rollback: delete the storage object
    await admin.storage.from(BUCKET).remove([storagePath]).catch(() => {});
    throw new Error(`documents insert failed: ${insertError?.message ?? 'unknown'}`);
  }

  return {
    documentId: doc.id,
    storagePath: `${BUCKET}/${storagePath}`,
    contentHash,
    sizeBytes: buffer.length,
  };
}

/**
 * Generate a short-lived signed URL for viewing a document.
 * Used by both the driver (viewing their own uploads) and admin verifiers.
 */
export async function signedDocumentUrl(
  storagePath: string,
  expiresInSeconds = 300
): Promise<string | null> {
  const admin = createServiceRoleClient();
  // storagePath is stored as "bucket/rest/of/path" — strip the bucket prefix
  const withoutBucket = storagePath.startsWith(`${BUCKET}/`)
    ? storagePath.slice(BUCKET.length + 1)
    : storagePath;

  const { data, error } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(withoutBucket, expiresInSeconds);
  if (error || !data) return null;
  return data.signedUrl;
}
