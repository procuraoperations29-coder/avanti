import { NextResponse } from 'next/server';
import { requireAuthUser, AuthError } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * POST /api/driver/onboarding/submit
 *
 * Validates state, inserts documents, creates payout method, mirrors
 * experience data into real driver_profiles columns (vehicle_class_experience,
 * transmission_experience, languages, years_experience, service_radius_km),
 * flips verification_status to 'submitted'.
 */

const BUCKET = 'driver-documents';

const ID_TYPE_TO_DOC: Record<string, string> = {
  nin: 'national_id',
  passport: 'passport',
  voters_card: 'voter_card',
  drivers_licence: 'driver_licence_front',
};

/**
 * Reduce a stored reference to a real storage path. Older onboarding flows
 * saved a full signed URL (which broke admin previews). Accepts a plain path,
 * a "bucket/path", or a Supabase signed/public URL and returns just the path.
 */
function toStoragePath(value: unknown, bucket: string): string | null {
  if (typeof value !== 'string' || !value) return null;
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
  // A bare http URL we can't parse is unusable as a storage path.
  if (value.startsWith('http')) return null;
  return value;
}

export async function POST() {
  try {
    const user = await requireAuthUser();
    if (!user.roles.includes('driver')) {
      return NextResponse.json({ error: 'not_a_driver' }, { status: 403 });
    }

    const admin = createServiceRoleClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile, error: readErr } = await (admin as any)
      .from('driver_profiles')
      .select('id, onboarding_state, onboarding_submitted_at, available_on_demand, available_permanent, verification_status')
      .eq('user_id', user.id)
      .single();

    if (readErr || !profile) {
      return NextResponse.json({ error: 'profile_not_found' }, { status: 404 });
    }

    if (profile.onboarding_submitted_at) {
      return NextResponse.json({ submitted: true, alreadySubmitted: true });
    }

    const state = (profile.onboarding_state ?? {}) as Record<string, Record<string, unknown>>;

    const missing: string[] = [];
    const identity = state.identity ?? {};
    const licence = state.licence ?? {};
    const address = state.address ?? {};
    const background = state.background ?? {};
    const experience = state.experience ?? {};
    const payout = state.payout ?? {};

    if (!identity.legal_name || !identity.date_of_birth || !identity.id_type || !identity.id_number) {
      missing.push('identity');
    }
    if (!licence.licence_number || !licence.licence_class || !licence.expiry_date) {
      missing.push('licence');
    }
    if (!address.street_address || !address.city || !address.state) {
      missing.push('address');
    }
    const refs = (background.references as Array<Record<string, unknown>>) ?? [];
    if (refs.length < 2 || background.criminal_record_disclosure === undefined) {
      missing.push('background');
    }
    if (!experience.vehicle_classes || (experience.vehicle_classes as unknown[]).length === 0) {
      missing.push('experience');
    }
    if (!profile.available_on_demand && !profile.available_permanent) {
      missing.push('availability');
    }
    if (!payout.bank_code || !payout.account_number || !payout.account_holder_name) {
      missing.push('payout');
    }

    if (missing.length > 0) {
      return NextResponse.json(
        { error: 'incomplete', message: `Missing: ${missing.join(', ')}` },
        { status: 400 }
      );
    }

    // ---- Documents ----
    // Files are uploaded via /api/driver/onboarding/upload, which ALSO creates
    // the `documents` row (correct storage_path + metadata.kind). Here we
    // reconcile: enrich each existing row with the reference/expiry captured in
    // the form, and self-heal any row that is missing (e.g. an older upload that
    // predates row creation) by reconstructing the real storage path.
    const idType = typeof identity.id_type === 'string' ? identity.id_type : null;
    const idDocType = idType ? ID_TYPE_TO_DOC[idType] : null;
    const idNumber = typeof identity.id_number === 'string' ? identity.id_number : null;
    const licenceNumber = typeof licence.licence_number === 'string' ? licence.licence_number : null;
    const licenceExpiry = typeof licence.expiry_date === 'string' ? licence.expiry_date : null;

    type ExpectedDoc = {
      kind: string;
      documentType: string;
      stored: unknown;
      reference?: string | null;
      expiry?: string | null;
      metadata?: Record<string, unknown>;
    };
    const expected: ExpectedDoc[] = [
      { kind: 'id_front', documentType: idDocType ?? 'national_id', stored: identity.id_front_path, reference: idNumber, metadata: { side: 'front', source: 'onboarding' } },
      { kind: 'id_back', documentType: idDocType ?? 'national_id', stored: identity.id_back_path, reference: idNumber, metadata: { side: 'back', source: 'onboarding' } },
      { kind: 'licence_front', documentType: 'driver_licence_front', stored: licence.licence_front_path, reference: licenceNumber, expiry: licenceExpiry, metadata: { source: 'onboarding', licence_class: licence.licence_class } },
      { kind: 'licence_back', documentType: 'driver_licence_back', stored: licence.licence_back_path, reference: licenceNumber, expiry: licenceExpiry, metadata: { source: 'onboarding', licence_class: licence.licence_class } },
      { kind: 'utility_bill', documentType: 'utility_bill', stored: address.utility_bill_path, metadata: { source: 'onboarding' } },
      { kind: 'selfie', documentType: 'selfie', stored: identity.selfie_path, metadata: { source: 'onboarding' } },
    ];

    for (const doc of expected) {
      if (typeof doc.stored !== 'string' || !doc.stored) continue;
      const enrich: Record<string, unknown> = {};
      if (doc.reference != null) enrich.reference_number = doc.reference;
      if (doc.expiry != null) enrich.expiry_date = doc.expiry;

      // Try to enrich the row the upload route already created for this kind.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existing } = await (admin as any)
        .from('documents')
        .update({ ...enrich })
        .eq('owner_user_id', user.id)
        .eq('is_active', true)
        .eq('metadata->>kind', doc.kind)
        .select('id');

      if (existing && existing.length > 0) continue;

      // No row yet — reconstruct the real storage path and insert one.
      const storagePath = toStoragePath(doc.stored, BUCKET);
      if (!storagePath) continue;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: insErr } = await (admin as any).from('documents').insert({
        owner_user_id: user.id,
        document_type: doc.documentType,
        storage_bucket: BUCKET,
        storage_path: storagePath,
        reference_number: doc.reference ?? null,
        expiry_date: doc.expiry ?? null,
        metadata: { ...(doc.metadata ?? {}), kind: doc.kind },
        is_active: true,
      });
      if (insErr) console.error('[submit] documents self-heal insert failed:', doc.kind, insErr);
    }

    // ---- Payout method ----
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: payoutMethodErr } = await (admin as any)
      .from('driver_payout_methods')
      .insert({
        driver_id: profile.id,
        method_type: 'bank_account',
        bank_name: payout.bank_name,
        bank_code: payout.bank_code,
        account_number: payout.account_number,
        account_holder_name: payout.account_holder_name,
        is_default: true,
        is_verified: false,
      });
    if (payoutMethodErr && !payoutMethodErr.message?.toLowerCase().includes('duplicate')) {
      console.error('[submit] driver_payout_methods insert:', payoutMethodErr);
    }

    // ---- Mirror experience state into real driver_profiles columns ----
    // Only writing to columns confirmed to exist: vehicle_class_experience,
    // transmission_experience, languages, years_experience, service_radius_km.
    // Identity fields (legal_name, DOB, gender) live on public.users, not
    // driver_profiles.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateErr } = await (admin as any)
      .from('driver_profiles')
      .update({
        verification_status: 'submitted',
        onboarding_submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        vehicle_class_experience: experience.vehicle_classes ?? [],
        transmission_experience: experience.transmission_experience ?? [],
        languages: experience.languages ?? [],
        years_experience: experience.years_experience ?? 0,
        service_radius_km: experience.service_radius_km ?? null,
      })
      .eq('user_id', user.id);

    if (updateErr) {
      return NextResponse.json(
        { error: 'submit_failed', message: updateErr.message },
        { status: 500 }
      );
    }

    // ---- Also mirror identity into public.users where appropriate ----
    // date_of_birth and gender exist there. Best-effort — don't fail submit
    // if this update has issues.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: userUpdateErr } = await (admin as any)
      .from('users')
      .update({
        date_of_birth: identity.date_of_birth ?? null,
        gender: identity.gender ?? null,
      })
      .eq('id', user.id);
    if (userUpdateErr) {
      console.warn('[submit] users update (identity) failed:', userUpdateErr.message);
    }

    return NextResponse.json({
      submitted: true,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.code }, { status: err.status });
    }
    console.error('[submit]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
