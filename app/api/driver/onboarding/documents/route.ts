import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthUser, AuthError } from '@/lib/auth';
import { uploadDriverDocument, signedDocumentUrl } from '@/lib/storage/upload';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';

/**
 * POST /api/driver/onboarding/documents
 *
 * Multipart upload of a single document.
 *   Fields: file (required), kind (required, document_kind enum value)
 *
 * Returns: { documentId, filename, mimeType, sizeBytes, previewUrl }
 *
 * The previewUrl is a short-lived signed URL the client can render to
 * confirm the upload was received.
 */

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB, matches bucket limit
const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'application/pdf',
]);

const kindSchema = z.enum([
  'national_id',
  'passport',
  'drivers_licence',
  'proof_of_address',
  'selfie',
  'vehicle_registration',
  'insurance_certificate',
  'background_check_result',
  'medical_certificate',
  'defensive_driving_cert',
  'executive_protection_cert',
  'other',
]);

export async function POST(req: Request) {
  try {
    const user = await requireAuthUser();
    if (!user.roles.includes('driver')) {
      return NextResponse.json({ error: 'not_a_driver' }, { status: 403 });
    }

    const form = await req.formData();
    const file = form.get('file');
    const kindRaw = form.get('kind');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'no_file' }, { status: 400 });
    }
    if (typeof kindRaw !== 'string') {
      return NextResponse.json({ error: 'no_kind' }, { status: 400 });
    }
    const parsedKind = kindSchema.safeParse(kindRaw);
    if (!parsedKind.success) {
      return NextResponse.json({ error: 'invalid_kind' }, { status: 400 });
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'too_large', max: MAX_SIZE_BYTES, size: file.size },
        { status: 413 }
      );
    }
    if (!ALLOWED_MIME.has(file.type)) {
      return NextResponse.json(
        { error: 'unsupported_type', mime: file.type },
        { status: 415 }
      );
    }

    const result = await uploadDriverDocument({
      userId: user.id,
      kind: parsedKind.data,
      file,
      filename: file.name,
      mimeType: file.type,
    });

    const previewUrl = await signedDocumentUrl(result.storagePath);

    return NextResponse.json({
      documentId: result.documentId,
      filename: file.name,
      mimeType: file.type,
      sizeBytes: result.sizeBytes,
      previewUrl,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.code }, { status: err.status });
    }
    console.error('[onboarding/documents POST]', err);
    return NextResponse.json(
      { error: 'upload_failed', message: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

/**
 * GET  /api/driver/onboarding/documents
 *   Returns this driver's uploaded documents with signed preview URLs.
 */
export async function GET() {
  try {
    const user = await requireAuthUser();
    if (!user.roles.includes('driver')) {
      return NextResponse.json({ error: 'not_a_driver' }, { status: 403 });
    }

    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('documents')
      .select('id, kind, filename, mime_type, size_bytes, storage_path, uploaded_at')
      .eq('owner_user_id', user.id)
      .eq('is_active', true)
      .order('uploaded_at', { ascending: false });
    if (error) {
      return NextResponse.json({ error: 'list_failed' }, { status: 500 });
    }

    const withUrls = await Promise.all(
      (data ?? []).map(async (d: { storage_path: string } & Record<string, unknown>) => ({
        ...d,
        previewUrl: await signedDocumentUrl(d.storage_path),
      }))
    );

    return NextResponse.json({ documents: withUrls });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.code }, { status: err.status });
    }
    console.error('[onboarding/documents GET]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

/**
 * DELETE /api/driver/onboarding/documents?documentId=...
 *   Soft-delete: sets is_active=false. Real storage cleanup is deferred
 *   to a background job (not built here).
 */
export async function DELETE(req: Request) {
  try {
    const user = await requireAuthUser();
    if (!user.roles.includes('driver')) {
      return NextResponse.json({ error: 'not_a_driver' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const documentId = searchParams.get('documentId');
    if (!documentId) {
      return NextResponse.json({ error: 'no_document_id' }, { status: 400 });
    }

    const admin = createServiceRoleClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (admin as any)
      .from('documents')
      .update({ is_active: false })
      .eq('id', documentId)
      .eq('owner_user_id', user.id);
    if (error) {
      return NextResponse.json({ error: 'delete_failed', message: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.code }, { status: err.status });
    }
    console.error('[onboarding/documents DELETE]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
