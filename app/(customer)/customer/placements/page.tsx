import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export default async function CustomerPlacementsPage() {
  const user = await getAuthUser();
  if (!user) redirect('/sign-in');

  const A = await createServiceRoleClient();

  const { data: placements } = await A
    .from('placements')
    .select(`
      id,
      status,
      driver_id,
      monthly_salary,
      start_date,
      created_at,
      driver_profiles!inner(
        id,
        users!inner(full_name, email, phone)
      )
    `)
    .eq('customer_user_id', user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  return (
    <div className="min-h-screen bg-customer-bg pb-24">
      <div className="border-b border-customer-border bg-customer-card px-6 py-8">
        <h1 className="font-display text-3xl font-bold text-customer-text">My Placements</h1>
        <p className="mt-2 font-body text-sm text-customer-text-muted">
          Permanent staffing quotes waiting for your review and payment
        </p>
      </div>

      <div className="mx-auto max-w-2xl px-6 py-8">
        {!placements || placements.length === 0 ? (
          <div className="rounded-2xl border border-customer-border bg-customer-card p-8 text-center">
            <p className="font-body text-customer-text-muted">No pending placements yet.</p>
            <Link
              href="/customer"
              className="mt-4 inline-block text-customer-green hover:underline font-body text-sm"
            >
              Back to home
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {placements.map((placement: any) => (
              <Link
                key={placement.id}
                href={`/customer/placements/${placement.id}`}
              >
                <div className="rounded-2xl border border-customer-border bg-customer-card p-6 hover:border-customer-green/40 transition-colors cursor-pointer">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-display font-semibold text-customer-text text-lg">
                        {placement.driver_profiles?.users?.full_name}
                      </h3>
                      <div className="mt-2 space-y-1">
                        <p className="font-body text-sm text-customer-text-muted">
                          Monthly Salary: <span className="font-medium text-customer-text">₦{parseInt(placement.monthly_salary).toLocaleString()}</span>
                        </p>
                        <p className="font-body text-sm text-customer-text-muted">
                          Start Date: <span className="font-medium text-customer-text">{new Date(placement.start_date).toLocaleDateString()}</span>
                        </p>
                        <p className="font-body text-sm text-customer-text-muted">
                          Upfront Quote: <span className="font-medium text-customer-green">₦{(parseInt(placement.monthly_salary) * 0.5).toLocaleString()}</span>
                        </p>
                      </div>
                      <div className="mt-3 inline-block rounded-full bg-yellow-100 px-3 py-1">
                        <span className="font-body text-xs font-medium text-yellow-800">Pending Review</span>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-customer-text-muted shrink-0 mt-1" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
