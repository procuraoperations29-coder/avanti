import { NextResponse } from 'next/server';
import { requireAuthUser, AuthError } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * POST /api/driver/onboarding/submit
 *
 * Validates onboarding_state completeness, creates driver_payout_methods
 * row, writes documents table rows for each uploaded file, flips
 * verification_status to 'submitted'.
 */

const BUCKET = 'driver-documents';

// Maps identity.id_type (from the identity step) to the documents.document_type enum
const ID_TYPE_TO_DOC: Record<string, string> = {
  nin: 'national_id',
  passport: 'passport',
  voters_card: 'voter_card',
  drivers_licence: 'driver_licence_front',
};

interface DocumentInsert {
  owner_user_id: string;
  document_type: string;
  storage_bucket: string;
  storage_path: string;
  reference_number?: string | null;
  expiry_date?: string | null;
  metadata?: Record<string, unknown>;
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

    // Build document rows to insert
    const documents: DocumentInsert[] = [];

    const idType = typeof identity.id_type === 'string' ? identity.id_type : null;
    const idDocType = idType ? ID_TYPE_TO_DOC[idType] : null;
    const idFrontPath = typeof identity.id_front_path === 'string' ? identity.id_front_path : null;
    const idBackPath = typeof identity.id_back_path === 'string' ? identity.id_back_path : null;
    const idNumber = typeof identity.id_number === 'string' ? identity.id_number : null;

    if (idDocType && idFrontPath) {
      documents.push({
        owner_user_id: user.id,
        document_type: idDocType,
        storage_bucket: BUCKET,
        storage_path: idFrontPath,
        reference_number: idNumber,
        metadata: { side: 'front', source: 'onboarding' },
      });
    }
    if (idDocType && idBackPath) {
      documents.push({
        owner_user_id: user.id,
        document_type: idDocType,
        storage_bucket: BUCKET,
        storage_path: idBackPath,
        reference_number: idNumber,
        metadata: { side: 'back', source: 'onboarding' },
      });
    }

    const licenceFrontPath = typeof licence.licence_front_path === 'string' ? licence.licence_front_path : null;
    const licenceBackPath = typeof licence.licence_back_path === 'string' ? licence.licence_back_path : null;
    const licenceNumber = typeof licence.licence_number === 'string' ? licence.licence_number : null;
    const licenceExpiry = typeof licence.expiry_date === 'string' ? licence.expiry_date : null;

    if (licenceFrontPath) {
      documents.push({
        owner_user_id: user.id,
        document_type: 'driver_licence_front',
        storage_bucket: BUCKET,
        storage_path: licenceFrontPath,
        reference_number: licenceNumber,
        expiry_date: licenceExpiry,
        metadata: { source: 'onboarding', licence_class: licence.licence_class },
      });
    }
    if (licenceBackPath) {
      documents.push({
        owner_user_id: user.id,
        document_type: 'driver_licence_back',
        storage_bucket: BUCKET,
        storage_path: licenceBackPath,
        reference_number: licenceNumber,
        expiry_date: licenceExpiry,
        metadata: { source: 'onboarding', licence_class: licence.licence_class },
      });
    }

    const utilityBillPath = typeof address.utility_bill_path === 'string' ? address.utility_bill_path : null;
    if (utilityBillPath) {
      documents.push({
        owner_user_id: user.id,
        document_type: 'utility_bill',
        storage_bucket: BUCKET,
        storage_path: utilityBillPath,
        metadata: { source: 'onboarding' },
      });
    }

    // Insert all documents in one batch
    if (documents.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: docsErr } = await (admin as any)
        .from('documents')
        .insert(documents);

      if (docsErr) {
        console.error('[submit] documents insert failed:', docsErr);
        // Don't block submission — admin can still find files in the bucket
      }
    }

    // Create driver_payout_methods row (unverified)
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

    // Flip verification_status + timestamp
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateErr } = await (admin as any)
      .from('driver_profiles')
      .update({
        verification_status: 'submitted',
        onboarding_submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    if (updateErr) {
      return NextResponse.json(
        { error: 'submit_failed', message: updateErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      submitted: true,
      documentsInserted: documents.length,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.code }, { status: err.status });
    }
    console.error('[submit]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
