import { NextResponse } from 'next/server';
import { requireAuthUser, AuthError } from '@/lib/auth';
import { uploadDriverDocument, signedDocumentUrl } from '@/lib/storage/upload';

/**
 * POST /api/driver/onboarding/upload
 *
 * Multipart form data:
 *   - file: the file
 *   - documentType: e.g. 'licence_front', 'utility_bill', 'id_front', 'selfie'
 *
 * Uploads to the driver-documents bucket AND creates the matching `documents`
 * row (so the admin verification queue can see and download it). Returns the
 * storage path plus a signed preview URL for the onboarding UI.
 */

const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

// Allow-list for documentType to prevent path injection
const ALLOWED_DOCUMENT_TYPES = new Set([
  'id_front',
  'id_back',
  'licence_front',
  'licence_back',
  'utility_bill',
  'address_proof',
  'selfie',
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
    const documentType = form.get('documentType');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'no_file' }, { status: 400 });
    }
    if (typeof documentType !== 'string' || !ALLOWED_DOCUMENT_TYPES.has(documentType)) {
      return NextResponse.json({ error: 'invalid_document_type' }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'file_too_large', message: 'Max 10MB' },
        { status: 400 }
      );
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: 'unsupported_type', message: 'JPG, PNG, WEBP, or PDF only' },
        { status: 400 }
      );
    }

    // Uploads to storage AND inserts the documents row (retiring any previous
    // active upload of the same kind). This is what makes it visible to admins.
    const result = await uploadDriverDocument({
      userId: user.id,
      kind: documentType,
      file,
      filename: file.name,
      mimeType: file.type,
    });

    // 1-year preview URL — stored in onboarding_state for the driver's own view.
    const url = await signedDocumentUrl(result.storageBucket, result.storagePath, 60 * 60 * 24 * 365);

    return NextResponse.json({
      path: result.storagePath,
      documentId: result.documentId,
      url,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.code }, { status: err.status });
    }
    console.error('[upload]', err);
    return NextResponse.json(
      { error: 'upload_failed', message: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
