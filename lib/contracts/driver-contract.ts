import 'server-only';
import { buildDriverContractTerms, type ContractTerms } from '@/lib/contracts/generate';

export interface DriverContractRow {
  id: string;
  terms: ContractTerms;
  status: string;
  signature: { name: string; date: string } | null;
  countersignature: { name: string; date: string } | null;
}

/**
 * Build the driver services-contract terms from the driver's current onboarding
 * data. Returns null if the driver profile isn't found. `existingReference`
 * keeps the contract reference stable when regenerating.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function buildDriverTerms(admin: any, userId: string, existingReference?: string): Promise<ContractTerms | null> {
  const A = admin;
  const { data: profile } = await A.from('driver_profiles')
    .select('id, verification_tier, onboarding_state, next_of_kin_name, next_of_kin_phone, next_of_kin_relationship')
    .eq('user_id', userId)
    .single();
  if (!profile) return null;

  const { data: u } = await A.from('users').select('full_name').eq('id', userId).single();
  const st = (profile.onboarding_state ?? {}) as Record<string, Record<string, unknown>>;
  const identity = st.identity ?? {};
  const licence = st.licence ?? {};
  const address = st.address ?? {};
  const payout = st.payout ?? {};

  // Durable NIN lives on the documents row (national_id.reference_number).
  const { data: nidDoc } = await A.from('documents')
    .select('reference_number')
    .eq('owner_user_id', userId)
    .eq('document_type', 'national_id')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const acct = typeof payout.account_number === 'string' ? payout.account_number : '';
  const addrLine = [address.street_address, address.city, address.state].filter((x) => typeof x === 'string' && x).join(', ');
  const reference = existingReference ?? `DRV-${String(profile.id).slice(0, 8)}-${Date.now()}`;

  return buildDriverContractTerms({
    reference,
    driverName: u?.full_name ?? 'the Driver',
    dateOfBirth: typeof identity.date_of_birth === 'string' ? identity.date_of_birth : null,
    idType: typeof identity.id_type === 'string' ? identity.id_type : null,
    idNumber: (nidDoc?.reference_number as string) ?? (typeof identity.id_number === 'string' ? identity.id_number : null),
    licenceNumber: typeof licence.licence_number === 'string' ? licence.licence_number : null,
    licenceClass: typeof licence.licence_class === 'string' ? licence.licence_class : null,
    address: addrLine || null,
    tier: String(profile.verification_tier ?? 't1'),
    bankName: typeof payout.bank_name === 'string' ? payout.bank_name : null,
    accountLast4: acct ? acct.slice(-4) : null,
    nextOfKinName: profile.next_of_kin_name ?? null,
    nextOfKinPhone: profile.next_of_kin_phone ?? null,
    nextOfKinRelationship: profile.next_of_kin_relationship ?? null,
    commissionNote: 'Avanti deducts its platform commission from the customer fee; the balance is paid to the account on record after each completed engagement.',
    generatedAt: new Date().toISOString(),
  });
}

/** Rebuild a driver contract's stored terms from current onboarding data (in place). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function regenerateDriverContract(admin: any, contractId: string): Promise<boolean> {
  const A = admin;
  const { data: c } = await A.from('contracts')
    .select('id, subject_user_id, kind, terms')
    .eq('id', contractId)
    .single();
  if (!c || c.kind !== 'employment_permanent' || !c.subject_user_id) return false;
  const existingRef = (c.terms as ContractTerms | null)?.reference;
  const terms = await buildDriverTerms(A, c.subject_user_id, existingRef);
  if (!terms) return false;
  await A.from('contracts').update({ terms, updated_at: new Date().toISOString() }).eq('id', contractId);
  return true;
}

/**
 * Ensure an approved driver has a standalone services contract (generating it
 * from their onboarding data on first request), and return it with any
 * signature. Unsigned contracts are refreshed from current data on each view so
 * corrections (e.g. the legal name) flow through automatically. Returns null if
 * the driver isn't approved yet.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function ensureDriverContract(admin: any, userId: string): Promise<DriverContractRow | null> {
  const A = admin;
  const { data: profile } = await A.from('driver_profiles')
    .select('verification_status')
    .eq('user_id', userId)
    .single();
  if (!profile || profile.verification_status !== 'approved') return null;

  const { data: existing } = await A.from('contracts')
    .select('id, terms, status')
    .eq('subject_user_id', userId)
    .eq('kind', 'employment_permanent')
    .is('engagement_id', null)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  let contract = existing;
  if (!contract) {
    const terms = await buildDriverTerms(A, userId);
    if (!terms) return null;
    const { data: inserted, error } = await A.from('contracts')
      .insert({ subject_user_id: userId, kind: 'employment_permanent', jurisdiction: 'NG', currency: 'NGN', terms, status: 'pending_signatures' })
      .select('id, terms, status')
      .single();
    if (error) {
      const { data: again } = await A.from('contracts').select('id, terms, status').eq('subject_user_id', userId).eq('kind', 'employment_permanent').is('engagement_id', null).limit(1).maybeSingle();
      contract = again;
    } else {
      contract = inserted;
    }
    if (!contract) return null;
  } else if (contract.status === 'pending_signatures') {
    // Not signed yet — refresh terms so corrections flow through.
    const terms = await buildDriverTerms(A, userId, (contract.terms as ContractTerms | null)?.reference);
    if (terms) {
      await A.from('contracts').update({ terms, updated_at: new Date().toISOString() }).eq('id', contract.id);
      contract = { ...contract, terms };
    }
  }

  const { data: sigs } = await A.from('signatures')
    .select('signatory_role, signature_ref, signed_at')
    .eq('contract_id', contract.id);
  const fmtSig = (s: { signature_ref: string; signed_at: string }) => ({ name: s.signature_ref, date: new Date(s.signed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) });
  const rows = (sigs ?? []) as Array<{ signatory_role: string; signature_ref: string; signed_at: string }>;
  const driverSig = rows.find((s) => s.signatory_role === 'driver');
  const avantiSig = rows.find((s) => s.signatory_role === 'avanti_witness');

  return {
    id: contract.id,
    terms: contract.terms as ContractTerms,
    status: contract.status,
    signature: driverSig ? fmtSig(driverSig) : null,
    countersignature: avantiSig ? fmtSig(avantiSig) : null,
  };
}
