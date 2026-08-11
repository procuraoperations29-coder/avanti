import { NextResponse } from 'next/server';
import { requireAuthUser, AuthError } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { canManageCarHire } from '../../partners/route';

const BUCKET = 'car-hire-vehicles';
const ALLOWED = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
const MAX = 10 * 1024 * 1024;

/**
 * POST /api/admin/car-hire/vehicles/photo — upload a catalog photo to the
 * public car-hire-vehicles bucket. Returns { path, url } (public URL).
 */
export async function POST(req: Request) {
  try {
    const user = await requireAuthUser();
    if (!canManageCarHire(user.roles)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) return NextResponse.json({ error: 'no_file' }, { status: 400 });
    if (file.size > MAX) return NextResponse.json({ error: 'file_too_large', message: 'Max 10MB' }, { status: 400 });
    if (!ALLOWED.has(file.type)) return NextResponse.json({ error: 'unsupported_type', message: 'JPG, PNG or WEBP' }, { status: 400 });

    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
    const path = `${user.id}/${Date.now()}-${safe}`;
    const admin = createServiceRoleClient();
    const buffer = Buffer.from(await file.arrayBuffer());

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (admin as any).storage.from(BUCKET).upload(path, buffer, {
      contentType: file.type,
      upsert: false,
    });
    if (error) return NextResponse.json({ error: 'upload_failed', message: error.message }, { status: 500 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = (admin as any).storage.from(BUCKET).getPublicUrl(path);
    return NextResponse.json({ path, url: data?.publicUrl ?? null });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.code }, { status: err.status });
    console.error('[car-hire vehicle photo]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
