import { NextResponse } from 'next/server';
import { requireAuthUser, AuthError } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * POST /api/driver/onboarding/upload
 *
 * Multipart form data:
 *   - file: the file
 *   - documentType: e.g. 'licence_front', 'utility_bill', 'id_front'
 *
 * Stores the file in the onboarding-documents bucket at path:
 *   {user_id}/{documentType}/{timestamp}-{safe_filename}
 *
 * Returns the storage path (not a signed URL — we generate signed URLs
 * on-demand when rendering previews or in admin review).
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
  'other',
]);

function safeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100);
}

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

    const timestamp = Date.now();
    const path = `${user.id}/${documentType}/${timestamp}-${safeFilename(file.name)}`;

    const admin = createServiceRoleClient();

    const buffer = Buffer.from(await file.arrayBuffer());

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: uploadErr } = await (admin as any).storage
      .from('onboarding-documents')
      .upload(path, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadErr) {
      console.error('[upload] Supabase storage error:', uploadErr);
      return NextResponse.json(
        { error: 'upload_failed', message: uploadErr.message },
        { status: 500 }
      );
    }

    // Generate a 1-year signed URL for immediate preview
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: signed } = await (admin as any).storage
      .from('onboarding-documents')
      .createSignedUrl(path, 60 * 60 * 24 * 365);

    return NextResponse.json({
      path,
      url: signed?.signedUrl ?? null,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.code }, { status: err.status });
    }
    console.error('[upload]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
