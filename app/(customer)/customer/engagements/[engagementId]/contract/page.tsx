import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { getAuthUser } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { ContractDocument } from '@/components/contracts/contract-document';
import { SignForm } from '@/components/contracts/sign-form';
import type { ContractTerms } from '@/lib/contracts/generate';

export const dynamic = 'force-dynamic';

export default async function ContractPage({ params }: { params: Promise<{ engagementId: string }> }) {
  const { engagementId } = await params;
  const user = await getAuthUser();
  if (!user) redirect(`/sign-in?next=/customer/engagements/${engagementId}/contract`);

  const admin = createServiceRoleClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const A = admin as any;
  const { data: eng } = await A.from('engagements')
    .select('id, status, customer_user_id, contract_id')
    .eq('id', engagementId)
    .single();
  if (!eng || eng.customer_user_id !== user.id) notFound();

  // Only relevant while awaiting signature/payment; otherwise show the engagement.
  if (eng.status !== 'contract_pending') redirect(`/customer/engagements/${engagementId}`);
  if (!eng.contract_id) redirect(`/customer/engagements/${engagementId}`);

  const { data: contract } = await A.from('contracts').select('terms, status').eq('id', eng.contract_id).single();
  if (!contract) notFound();
  const terms = contract.terms as ContractTerms;

  const { data: me } = await A.from('users').select('full_name').eq('id', user.id).single();

  return (
    <div className="mx-auto max-w-3xl px-4 pt-8 sm:px-6 pb-20">
      <Link href="/customer/search" className="mb-4 inline-flex items-center gap-1 font-body text-[13px] text-admin-text-muted transition-colors hover:text-admin-text">
        <ChevronLeft className="h-3.5 w-3.5" /> Back
      </Link>

      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-admin-text">Review &amp; sign your agreement</h1>
        <p className="mt-1 font-body text-[13px] text-admin-text-muted">Please read the agreement below. Sign it to continue to payment — your booking is confirmed once payment is received.</p>
      </div>

      <ContractDocument terms={terms} />

      <div className="mt-6">
        <SignForm
          endpoint={`/api/customer/engagements/${engagementId}/sign-and-pay`}
          expectedName={me?.full_name ?? null}
          submitLabel="Sign & continue to payment"
          theme="admin"
        />
      </div>
    </div>
  );
}
