import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, CalendarDays } from 'lucide-react';
import { getAuthUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { SectionLabel } from '@/components/avanti/section-label';
import { EmptyState } from '@/components/avanti/empty-state';
import { EngagementCard } from '@/components/customer/engagement-card';
import { Button } from '@/components/ui/button';

export default async function EngagementsListPage() {
  const user = await getAuthUser();
  if (!user) redirect('/sign-in');
  if (!user.roles.includes('individual_customer')) redirect('/sign-in');

  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rows } = await (supabase as any)
    .from('v_engagements_customer')
    .select('id, driver_name, engagement_type, status, starts_at, currency, customer_price_total')
    .eq('customer_user_id', user.id)
    .order('starts_at', { ascending: false });

  const items = rows ?? [];

  return (
    <div className="mx-auto max-w-3xl px-4 pt-8 sm:px-6 pb-20">
      <Link
        href="/customer"
        className="mb-4 inline-flex items-center gap-1 font-mono text-xs uppercase tracking-wider text-ink-muted hover:text-ink"
      >
        <ChevronLeft className="h-3.5 w-3.5" /> Home
      </Link>

      <SectionLabel>Engagements</SectionLabel>
      <h1 className="mb-8 mt-2 font-display text-4xl leading-tight text-ink">
        <em className="italic">Everything</em> you&apos;ve booked.
      </h1>

      {items.length === 0 ? (
        <EmptyState
          Icon={CalendarDays}
          title="No engagements yet"
          description="Find a driver to make your first booking."
          action={
            <Link href="/customer/search">
              <Button size="sm">Find a driver</Button>
            </Link>
          }
        />
      ) : (
        <div className="border border-line bg-paper-2">
          {items.map((e: {
            id: string;
            driver_name: string | null;
            engagement_type: string;
            status: string;
            starts_at: string;
            currency: string;
            customer_price_total: number | null;
          }) => (
            <EngagementCard
              key={e.id}
              engagementId={e.id}
              driverName={e.driver_name ?? 'Driver'}
              engagementType={e.engagement_type}
              status={e.status}
              startsAt={e.starts_at}
              currency={e.currency}
              customerPriceTotal={e.customer_price_total ?? 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}
