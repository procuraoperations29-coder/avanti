import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { getAuthUser } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { PageShell } from '@/components/shell/page-shell';
import { SectionLabel } from '@/components/avanti/section-label';
import { EmptyState } from '@/components/avanti/empty-state';
import { ContractDocument } from '@/components/contracts/contract-document';
import { SignForm } from '@/components/contracts/sign-form';
import { ensureDriverContract } from '@/lib/contracts/driver-contract';
import { FileText } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function DriverContractPage() {
  const user = await getAuthUser();
  if (!user) redirect('/sign-in');
  if (!user.roles.includes('driver')) redirect('/sign-in');

  const admin = createServiceRoleClient();
  const contract = await ensureDriverContract(admin, user.id);

  return (
    <PageShell>
      <Link href="/driver" className="mb-4 inline-flex items-center gap-1.5 font-body text-[13px] text-ink-muted transition-colors hover:text-ink">
        <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2} /> Dashboard
      </Link>

      <div className="mb-6">
        <SectionLabel>Your agreement</SectionLabel>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink">Driver services agreement</h1>
      </div>

      {!contract ? (
        <EmptyState Icon={FileText} title="Available after approval" description="Once your verification is approved, your services agreement will appear here to review and sign." />
      ) : (
        <>
          <ContractDocument terms={contract.terms} signature={contract.signature} countersignature={contract.countersignature} />
          <div className="mt-4">
            <a href={`/api/contracts/${contract.id}/pdf`} className="inline-flex items-center gap-1.5 border border-line bg-paper-2 px-4 py-2 font-body text-sm font-medium text-ink transition-colors hover:bg-paper-3">
              Download PDF ↓
            </a>
          </div>
          {contract.signature ? (
            <p className="mt-4 font-body text-[13px] text-ink-muted">You signed this agreement on {contract.signature.date}. Thank you.</p>
          ) : (
            <div className="mt-6">
              <SignForm endpoint="/api/driver/contract/sign" expectedName={null} submitLabel="Sign agreement" theme="paper" />
            </div>
          )}
        </>
      )}
    </PageShell>
  );
}
