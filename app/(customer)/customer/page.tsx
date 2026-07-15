import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Search, CalendarDays, ArrowRight } from 'lucide-react';
import { getAuthUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { PageShell } from '@/components/avanti/page-shell';
import { SectionLabel } from '@/components/avanti/section-label';
import { EmptyState } from '@/components/avanti/empty-state';
import { Button } from '@/components/ui/button';
import { EngagementCard } from '@/components/customer/engagement-card';

export default async function CustomerHomePage() {
  const user = await getAuthUser();
  if (!user) redirect('/sign-in');
  if (!user.roles.includes('individual_customer')) redirect('/sign-in');

  const supabase = await createClient();
  const { data: recent } = await supabase
    .from('v_engagements_customer')
    .select('id, driver_name, engagement_type, status, starts_at, currency, customer_price_total')
    .eq('customer_user_id', user.id)
    .order('starts_at', { ascending: false })
    .limit(5);

  const items = recent ?? [];

  return (
    <PageShell>
      <div className="mx-auto max-w-4xl px-4 pt-8 sm:px-6 pb-20">
        <div className="mb-10">
          <SectionLabel>Signed in · {user.phone}</SectionLabel>
          <h1 className="mt-2 font-display text-4xl leading-tight text-ink">
            What today?
          </h1>
        </div>

        <div className="mb-10 grid gap-4 sm:grid-cols-2">
          <Link
            href="/customer/search"
            className="group flex items-center gap-4 border border-ink bg-ink p-5 text-paper transition-colors hover:bg-ink-2"
          >
            <Search className="h-6 w-6" strokeWidth={1.5} />
            <div className="flex-1">
              <div className="font-display text-xl leading-none">Find a driver</div>
              <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-paper/70">
                Book by the hour or the day
              </div>
            </div>
            <ArrowRight className="h-4 w-4" />
          </Link>

          <Link
            href="/customer/engagements"
            className="group flex items-center gap-4 border border-line-strong bg-paper-2 p-5 text-ink transition-colors hover:bg-paper-3"
          >
            <CalendarDays className="h-6 w-6" strokeWidth={1.5} />
            <div className="flex-1">
              <div className="font-display text-xl leading-none">Your engagements</div>
              <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                Upcoming, past, and drafts
              </div>
            </div>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div>
          <div className="mb-3 flex items-baseline justify-between">
            <SectionLabel>Recent</SectionLabel>
            <Link
              href="/customer/engagements"
              className="font-mono text-xs uppercase tracking-wider text-ink-muted hover:text-ink"
            >
              All →
            </Link>
          </div>

          {items.length === 0 ? (
            <EmptyState
              Icon={CalendarDays}
              title="No engagements yet"
              description="When you book a driver, it'll show up here."
              action={
                <Link href="/customer/search">
                  <Button size="sm">Find a driver</Button>
                </Link>
              }
            />
          ) : (
            <div className="border border-line bg-paper-2">
              {items.map((e) => (
                <EngagementCard
                  key={e.id!}
                  engagementId={e.id!}
                  driverName={e.driver_name ?? 'Driver'}
                  engagementType={e.engagement_type!}
                  status={e.status!}
                  startsAt={e.starts_at!}
                  currency={e.currency!}
                  customerPriceTotal={Number(e.customer_price_total ?? 0)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
