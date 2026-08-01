import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Search, UserCheck, CalendarDays, ArrowRight } from 'lucide-react';
import { getAuthUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
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
        <div className="mb-8">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-admin-text">
            What today?
          </h1>
          <p className="mt-1 font-body text-[13px] text-admin-text-muted">
            Signed in · {user.phone}
          </p>
        </div>

        {/* ─── PRIMARY ACTIONS ─── */}
        <div className="mb-10 grid gap-4 sm:grid-cols-2">
          {/* Hourly / Daily */}
          <Link
            href="/customer/search"
            className="group flex flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-br from-admin-navy to-admin-navy-2 p-6 text-white shadow-admin transition-all hover:-translate-y-0.5"
          >
            <div>
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-admin-green shadow-admin-glow">
                <Search className="h-5 w-5 text-admin-navy-2" strokeWidth={2} />
              </span>
              <div className="mt-4 font-display text-2xl font-semibold tracking-tight">On-demand</div>
              <p className="mt-2 max-w-sm font-body text-sm text-white/70">
                Book by the hour or day. Airport runs, events, errands, evenings. From ₦4,500 an
                hour.
              </p>
            </div>
            <div className="mt-6 inline-flex items-center gap-2 font-body text-sm font-medium transition-transform group-hover:translate-x-1">
              Find a driver
              <ArrowRight className="h-4 w-4" strokeWidth={2} />
            </div>
          </Link>

          {/* Permanent */}
          <Link
            href="/customer/permanent"
            className="group flex flex-col justify-between rounded-2xl border border-admin-green/30 bg-admin-green-soft p-6 text-admin-text shadow-admin-sm transition-all hover:-translate-y-0.5 hover:shadow-admin"
          >
            <div>
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-admin-card text-admin-green-text shadow-admin-sm">
                <UserCheck className="h-5 w-5" strokeWidth={2} />
              </span>
              <div className="mt-4 font-display text-2xl font-semibold tracking-tight text-admin-text">
                Permanent placement
              </div>
              <p className="mt-2 max-w-sm font-body text-sm text-admin-text-muted">
                Hire a verified driver full-time. Monthly salary set by us. From ₦175,000/month.
              </p>
            </div>
            <div className="mt-6 inline-flex items-center gap-2 font-body text-sm font-medium text-admin-green-text transition-transform group-hover:translate-x-1">
              Browse drivers
              <ArrowRight className="h-4 w-4" strokeWidth={2} />
            </div>
          </Link>
        </div>

        {/* ─── SECONDARY ─── */}
        <Link
          href="/customer/engagements"
          className="group mb-10 flex items-center gap-4 rounded-2xl border border-admin-border bg-admin-card p-5 shadow-admin-sm transition-all hover:-translate-y-0.5 hover:shadow-admin"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-admin-bg text-admin-text-muted">
            <CalendarDays className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <div className="flex-1">
            <div className="font-body text-[15px] font-semibold text-admin-text">Your engagements</div>
            <div className="mt-0.5 font-body text-[12px] text-admin-text-muted">
              Upcoming, past, and drafts
            </div>
          </div>
          <ArrowRight
            className="h-4 w-4 text-admin-text-muted transition-transform group-hover:translate-x-0.5"
            strokeWidth={1.75}
          />
        </Link>

        {/* ─── RECENT ─── */}
        <div>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-display text-[15px] font-semibold tracking-tight text-admin-text">
              Recent
            </h2>
            <Link
              href="/customer/engagements"
              className="font-body text-[13px] font-medium text-admin-green-text hover:text-admin-green"
            >
              View all
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
            <div className="overflow-hidden rounded-2xl border border-admin-border bg-admin-card shadow-admin-sm">
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
