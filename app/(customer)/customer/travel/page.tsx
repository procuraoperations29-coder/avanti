import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { getAuthUser } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { TripRequestForm } from './trip-request-form';

/**
 * Out-of-state / inter-city trip request. A high-touch, quote-first flow:
 * the customer describes the trip; ops matches a driver and prices it by hand.
 */
export default async function TravelRequestPage() {
  const user = await getAuthUser();
  if (!user) redirect('/sign-in');
  if (!user.roles.includes('individual_customer')) redirect('/sign-in');

  // Pre-fill the contact field from the customer's account.
  const admin = createServiceRoleClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: me } = await (admin as any)
    .from('users')
    .select('phone, email')
    .eq('id', user.id)
    .single();
  const defaultContact = me?.phone ? `+${me.phone}` : (me?.email ?? '');

  return (
    <div className="mx-auto max-w-3xl px-4 pt-8 pb-20 sm:px-6">
      <Link
        href="/customer"
        className="mb-6 inline-flex items-center gap-1.5 font-body text-[13px] text-admin-text-muted transition-colors hover:text-admin-text"
      >
        <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2} />
        Home
      </Link>

      <div className="mb-8">
        <div className="mb-3 inline-flex items-center rounded-full bg-admin-green-soft px-2.5 py-1 font-body text-[11px] font-medium uppercase tracking-wide text-admin-green-text">
          Out of state
        </div>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-admin-text md:text-4xl">
          Travelling out of state?
        </h1>
        <p className="mt-3 max-w-2xl font-body leading-relaxed text-admin-text-muted">
          Tell us about your trip and we&apos;ll match you with the right driver, then send a quote
          with the price and conditions. It only takes a minute — no charge until you accept.
        </p>
      </div>

      <TripRequestForm defaultContact={defaultContact} />
    </div>
  );
}
