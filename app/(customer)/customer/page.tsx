import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Search, UserCheck, CalendarDays, ArrowRight } from 'lucide-react';
import { getAuthUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
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
    <div className="mx-auto max-w-5xl px-4 pt-8 sm:px-6 pb-20">
        <div className="mb-10">
          <SectionLabel>Signed in · {user.phone}</SectionLabel>
          <h1 className="mt-2 font-display text-4xl leading-tight text-ink">
            What today?
          </h1>
        </div>

        {/* ─── PRIMARY ACTIONS ─── */}
        <div className="mb-6">
          <SectionLabel>Book a driver</SectionLabel>
        </div>
        <div className="mb-10 grid gap-4 sm:grid-cols-2">
          {/* Hourly / Daily */}
          <Link
            href="/customer/search"
            className="group flex flex-col justify-between border border-ink bg-ink p-6 text-paper transition-colors hover:bg-ink-2"
          >
            <div>
              <Search className="h-6 w-6" strokeWidth={1.5} />
              <div className="mt-4 font-display text-2xl leading-tight">
                On-demand
              </div>
              <p className="mt-2 max-w-sm font-body text-sm text-paper/80">
                Book by the hour or day. Airport runs, events, errands, evenings.
                From ₦4,500 an hour.
              </p>
            </div>
            <div className="mt-6 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider transition-transform group-hover:translate-x-1">
              Find a driver
              <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
            </div>
          </Link>

          {/* Permanent */}
          <Link
            href="/customer/permanent"
            className="group flex flex-col justify-between border-2 border-brass bg-brass-soft p-6 text-ink transition-colors hover:bg-brass-soft/80"
          >
            <div>
              <UserCheck className="h-6 w-6" strokeWidth={1.5} />
              <div className="mt-4 font-display text-2xl leading-tight">
                Permanent placement
              </div>
              <p className="mt-2 max-w-sm font-body text-sm text-ink">
                Hire a verified driver full-time. Monthly salary set by us. From
                ₦175,000/month.
              </p>
            </div>
            <div className="mt-6 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider transition-transform group-hover:translate-x-1">
              Browse drivers
              <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
            </div>
          </Link>
        </div>

        {/* ─── SECONDARY ─── */}
        <Link
          href="/customer/engagements"
          className="mb-10 flex items-center gap-4 border border-line-strong bg-paper-2 p-5 text-ink transition-colors hover:bg-paper-3"
        >
          <CalendarDays className="h-5 w-5 text-ink-muted" strokeWidth={1.5} />
          <div className="flex-1">
            <div className="font-body text-base text-ink">Your engagements</div>
            <div className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-ink-muted">
              Upcoming, past, and drafts
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-ink-muted" strokeWidth={1.5} />
        </Link>

        {/* ─── RECENT ─── */}
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
  );
}
