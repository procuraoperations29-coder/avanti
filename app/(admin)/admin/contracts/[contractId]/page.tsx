import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getAuthUser } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { AdminPageHeader } from '@/components/avanti/admin/page-header';
import { ContractDocument } from '@/components/contracts/contract-document';
import { CountersignButton } from './countersign-button';
import type { ContractTerms } from '@/lib/contracts/generate';

export const dynamic = 'force-dynamic';

const STATUS_PILL: Record<string, string> = {
  draft: 'bg-admin-bg text-admin-text-muted',
  pending_signatures: 'bg-admin-amber-soft text-admin-amber-text',
  executed: 'bg-admin-green-soft text-admin-green-text',
  superseded: 'bg-admin-bg text-admin-text-muted',
  terminated: 'bg-red-500/12 text-red-600',
};
const KIND_LABEL: Record<string, string> = {
  engagement_short: 'On-demand engagement',
  engagement_standard: 'On-demand engagement',
  engagement_heavy: 'On-demand engagement',
  employment_permanent: 'Driver services agreement',
  substitution_addendum: 'Substitution addendum',
};

function fmt(d: string | null): string {
  return d ? new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
}

export default async function AdminContractPage({ params }: { params: Promise<{ contractId: string }> }) {
  const user = await getAuthUser();
  if (!user) redirect('/sign-in');
  const canView =
    user.roles.includes('admin_support') || user.roles.includes('admin_finance') ||
    user.roles.includes('admin_compliance') || user.roles.includes('admin_verifier') || user.roles.includes('super_admin');
  if (!canView) redirect('/admin');

  const { contractId } = await params;
  const admin = createServiceRoleClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const A = admin as any;
  const { data: c } = await A.from('contracts')
    .select('id, kind, status, engagement_id, subject_user_id, executed_at, created_at, terms')
    .eq('id', contractId)
    .single();
  if (!c) notFound();

  const { data: sigs } = await A.from('signatures')
    .select('signatory_role, signature_ref, signed_at, ip_address, signatory_id')
    .eq('contract_id', contractId)
    .order('signed_at', { ascending: true });

  // Who it's for.
  let subjectLabel = '—';
  let backHref = '/admin/engagements';
  if (c.engagement_id) {
    const { data: eng } = await A.from('engagements').select('customer_user_id').eq('id', c.engagement_id).single();
    if (eng?.customer_user_id) {
      const { data: cu } = await A.from('users').select('full_name').eq('id', eng.customer_user_id).single();
      subjectLabel = `Customer · ${cu?.full_name ?? '—'}`;
    }
    backHref = '/admin/engagements';
  } else if (c.subject_user_id) {
    const { data: su } = await A.from('users').select('full_name').eq('id', c.subject_user_id).single();
    subjectLabel = `Driver · ${su?.full_name ?? '—'}`;
    backHref = '/admin/drivers';
  }

  const terms = c.terms as ContractTerms;
  const rows = (sigs ?? []) as Array<{ signatory_role: string; signature_ref: string; signed_at: string; ip_address: string | null }>;
  const hasCountersign = rows.some((s) => s.signatory_role === 'avanti_witness');
  const hasPartySignature = rows.some((s) => s.signatory_role !== 'avanti_witness');

  return (
    <>
      <AdminPageHeader backHref={backHref} backLabel="Back" title={KIND_LABEL[c.kind] ?? 'Contract'} subtitle={subjectLabel} />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <span className={'inline-flex items-center rounded-full px-2.5 py-0.5 font-body text-[11px] font-medium uppercase tracking-wide ' + (STATUS_PILL[c.status] ?? 'bg-admin-bg text-admin-text-muted')}>{String(c.status).replace(/_/g, ' ')}</span>
        <span className="font-body text-[12px] text-admin-text-muted">Created {fmt(c.created_at)}{c.executed_at ? ` · Executed ${fmt(c.executed_at)}` : ''}</span>
        <a href={`/api/contracts/${contractId}/pdf`} className="font-body text-[12px] font-medium text-admin-green-text hover:underline">Download PDF ↓</a>
      </div>

      <ContractDocument terms={terms} />

      {/* Signatures */}
      <div className="mt-6 overflow-hidden rounded-2xl border border-admin-border bg-admin-card shadow-admin-sm">
        <div className="flex items-center justify-between border-b border-admin-border bg-admin-bg px-5 py-2.5">
          <span className="font-body text-[11px] font-semibold uppercase tracking-wide text-admin-text-muted">Signatures</span>
          {!hasCountersign && hasPartySignature && <CountersignButton contractId={contractId} />}
        </div>
        {rows.length === 0 ? (
          <div className="px-5 py-6 text-center font-body text-sm text-admin-text-muted">Not signed yet.</div>
        ) : (
          rows.map((s, i) => (
            <div key={i} className="flex flex-wrap items-center justify-between gap-2 border-b border-admin-border px-5 py-3 last:border-0">
              <div>
                <span className="font-body text-sm font-medium text-admin-text">{s.signature_ref}</span>
                <span className="ml-2 font-body text-[11px] uppercase tracking-wide text-admin-text-muted">{s.signatory_role.replace(/_/g, ' ')}</span>
              </div>
              <div className="font-body text-[12px] text-admin-text-muted">{fmt(s.signed_at)}{s.ip_address ? ` · ${s.ip_address}` : ''}</div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
