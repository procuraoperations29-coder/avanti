import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { PlacementPaymentForm } from '@/components/customer/placement-payment-form';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

interface PlacementDetailPageProps {
  params: {
    placementId: string;
  };
}

export default async function PlacementDetailPage({ params }: PlacementDetailPageProps) {
  const user = await getAuthUser();
  if (!user) redirect('/sign-in');

  const A = await createServiceRoleClient();

  const { data: placement, error } = await A
    .from('placements')
    .select(`
      id,
      status,
      driver_id,
      monthly_salary,
      start_date,
      driver_profiles!inner(
        id,
        users!inner(full_name, email, phone)
      )
    `)
    .eq('id', params.placementId)
    .eq('customer_user_id', user.id)
    .single();

  if (error || !placement) {
    redirect('/customer/placements');
  }

  const upfrontFee = parseInt(placement.monthly_salary) * 0.5;

  return (
    <div className="min-h-screen bg-customer-bg pb-24">
      <div className="border-b border-customer-border bg-customer-card px-6 py-6">
        <Link
          href="/customer/placements"
          className="inline-flex items-center gap-2 text-customer-green hover:underline mb-4"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="font-body text-sm">Back to Placements</span>
        </Link>
        <h1 className="font-display text-2xl font-bold text-customer-text">Placement Details</h1>
      </div>

      <div className="mx-auto max-w-2xl px-6 py-8 space-y-6">
        {/* Driver Card */}
        <div className="rounded-2xl border border-customer-border bg-customer-card p-6">
          <h2 className="font-display font-semibold text-customer-text mb-4">Driver Information</h2>
          <div className="space-y-3">
            <div>
              <p className="font-body text-sm text-customer-text-muted">Driver Name</p>
              <p className="font-body font-medium text-customer-text text-lg">
                {placement.driver_profiles?.users?.full_name}
              </p>
            </div>
            <div>
              <p className="font-body text-sm text-customer-text-muted">Contact</p>
              <p className="font-body font-medium text-customer-text">{placement.driver_profiles?.users?.phone}</p>
            </div>
          </div>
        </div>

        {/* Contract Terms */}
        <div className="rounded-2xl border border-customer-border bg-customer-card p-6">
          <h2 className="font-display font-semibold text-customer-text mb-4">Contract Terms</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="font-body text-sm text-customer-text-muted">Monthly Salary</p>
                <p className="font-body font-bold text-customer-text text-xl">
                  ₦{parseInt(placement.monthly_salary).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="font-body text-sm text-customer-text-muted">Start Date</p>
                <p className="font-body font-medium text-customer-text">
                  {new Date(placement.start_date).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="border-t border-customer-border pt-4">
              <p className="font-body text-sm text-customer-text-muted mb-3">Duration</p>
              <p className="font-body text-customer-text">
                Minimum 12 months. Either party can renew, modify, or end at the contract end date.
              </p>
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="rounded-2xl border-2 border-customer-green bg-customer-green/5 p-6">
          <h2 className="font-display font-semibold text-customer-text mb-4">Payment Required</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <p className="font-body text-customer-text">Monthly Salary</p>
              <p className="font-body font-medium">₦{parseInt(placement.monthly_salary).toLocaleString()}</p>
            </div>
            <div className="flex justify-between border-t border-customer-border pt-3">
              <p className="font-body"><strong>Upfront Payment (50%)</strong></p>
              <p className="font-body font-bold text-customer-green text-lg">₦{upfrontFee.toLocaleString()}</p>
            </div>
            <div className="bg-customer-bg rounded-lg p-3 mt-4">
              <p className="font-body text-xs text-customer-text-muted">
                After payment is confirmed, Avanti will finalize the agreement with the driver.
              </p>
            </div>
          </div>
        </div>

        {/* Terms */}
        <div className="rounded-2xl border border-customer-border bg-customer-card p-6">
          <h2 className="font-display font-semibold text-customer-text mb-4">Terms & Conditions</h2>
          <ul className="space-y-2 font-body text-sm text-customer-text-muted list-disc list-inside">
            <li>Pay monthly salary on or before agreed date</li>
            <li>Provide safe, professional work environment</li>
            <li>Comply with local labor laws</li>
            <li>Give 30 days notice to end contract</li>
          </ul>
        </div>

        {/* Payment Form */}
        <PlacementPaymentForm
          placementId={placement.id}
          amount={upfrontFee}
          driverName={placement.driver_profiles?.users?.full_name}
        />
      </div>
    </div>
  );
}
