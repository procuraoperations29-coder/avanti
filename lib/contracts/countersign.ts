import 'server-only';
import { COMPANY } from '@/config/company';

/**
 * Record Avanti's countersignature on a contract, as the counterparty
 * (signature_role 'avanti_witness'). Idempotent. The signature is attributed to
 * Avanti's authorised representative — the earliest super-admin — since
 * signatures.signatory_id must reference a real user.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function countersignAsAvanti(admin: any, contractId: string): Promise<void> {
  const A = admin;
  const { data: existing } = await A.from('signatures')
    .select('id')
    .eq('contract_id', contractId)
    .eq('signatory_role', 'avanti_witness')
    .maybeSingle();
  if (existing) return;

  const { data: roleRow } = await A.from('user_roles')
    .select('user_id')
    .eq('role', 'super_admin')
    .is('revoked_at', null)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  const signatoryId = roleRow?.user_id as string | undefined;
  if (!signatoryId) return; // no representative available — skip gracefully

  const { data: u } = await A.from('users').select('full_name').eq('id', signatoryId).single();
  const ref = u?.full_name
    ? `${u.full_name} — for and on behalf of ${COMPANY.legalName}`
    : COMPANY.legalName;

  await A.from('signatures')
    .insert({
      contract_id: contractId,
      signatory_id: signatoryId,
      signatory_role: 'avanti_witness',
      signature_ref: ref,
      signature_type: 'system',
      user_agent: 'system',
    })
    .then(() => {}, () => {});
}
