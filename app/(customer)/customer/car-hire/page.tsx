import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, CarFront, Users } from 'lucide-react';
import { getAuthUser } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { AdminSectionLabel } from '@/components/avanti/admin/page-header';
import { EmptyState } from '@/components/avanti/empty-state';
import { formatNaira } from '@/lib/permanent/salary';
import { computeCarHireQuote } from '@/lib/carhire/quote';
import { getPricingSettings } from '@/lib/pricing/settings';

export const dynamic = 'force-dynamic';

const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
function photoUrl(path: string | null): string | null {
  return path ? `${SUPA}/storage/v1/object/public/car-hire-vehicles/${path}` : null;
}

/** Customer-facing indicative daily price — computed from customer-safe fields only. */
function dailyAllIn(v: SafeVehicle, vatRate: number): number {
  return computeCarHireQuote(
    {
      daily_rate: Number(v.daily_rate),
      partner_daily_cost: 0,
      driver_daily_rate: Number(v.driver_daily_rate),
      driver_daily_pay: 0,
      included_hours_per_day: Number(v.included_hours_per_day),
      overtime_hourly_rate: v.overtime_hourly_rate != null ? Number(v.overtime_hourly_rate) : null,
      min_days: Number(v.min_days),
    },
    { days: 1, hoursPerDay: Number(v.included_hours_per_day) },
    vatRate
  ).offerTotal;
}

interface SafeVehicle {
  id: string;
  make: string;
  model: string;
  year: number | null;
  vehicle_class: string;
  transmission: string | null;
  seats: number | null;
  features: string[] | null;
  city: string | null;
  photo_path: string | null;
  daily_rate: number;
  driver_daily_rate: number;
  included_hours_per_day: number;
  overtime_hourly_rate: number | null;
  min_days: number;
}

export default async function CarHireCatalogPage() {
  const user = await getAuthUser();
  if (!user) redirect('/sign-in?next=/customer/car-hire');

  const admin = createServiceRoleClient();
  const { vatRate } = await getPricingSettings();
  // Customer-safe columns only — never partner cost, driver pay, or margin.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (admin as any)
    .from('hire_vehicles')
    .select('id, make, model, year, vehicle_class, transmission, seats, features, city, photo_path, daily_rate, driver_daily_rate, included_hours_per_day, overtime_hourly_rate, min_days')
    .eq('status', 'available')
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('daily_rate', { ascending: true });

  const vehicles = (data ?? []) as SafeVehicle[];

  return (
    <div className="mx-auto max-w-6xl px-6 pt-8 pb-20">
      <Link href="/customer" className="mb-4 inline-flex items-center gap-1.5 font-body text-[13px] text-admin-text-muted transition-colors hover:text-admin-text">
        <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2} />
        Home
      </Link>

      <div className="mb-10">
        <AdminSectionLabel>Car hire</AdminSectionLabel>
        <h1 className="mt-2 font-display text-4xl font-semibold leading-tight tracking-tight text-admin-text md:text-5xl">
          A car and a driver, for as long as you need.
        </h1>
        <p className="mt-6 max-w-2xl font-body text-lg leading-relaxed text-admin-text-muted">
          Pick a car, tell us the dates and hours per day, and we&apos;ll confirm availability and
          send your quote. Every hire comes with one of our verified drivers — the price you see is
          the car and the driver together.
        </p>
      </div>

      {vehicles.length === 0 ? (
        <EmptyState Icon={Users} title="No cars available right now" description="We're adding vehicles from our leasing partners. Check back soon." />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {vehicles.map((v) => {
            const url = photoUrl(v.photo_path);
            return (
              <Link
                key={v.id}
                href={`/customer/car-hire/${v.id}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-admin-border bg-admin-card shadow-admin-sm transition-all hover:-translate-y-0.5 hover:border-admin-green/40 hover:shadow-admin"
              >
                <div className="aspect-[16/10] w-full overflow-hidden bg-admin-bg">
                  {url ? (
                    <img src={url} alt={`${v.make} ${v.model}`} className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-admin-text-muted"><CarFront className="h-10 w-10" strokeWidth={1.25} /></div>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <div className="font-display text-xl font-semibold tracking-tight text-admin-text">
                    {v.make} {v.model}{v.year ? ` · ${v.year}` : ''}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {[v.vehicle_class, v.transmission, v.seats ? `${v.seats} seats` : null, v.city].filter(Boolean).map((t) => (
                      <span key={String(t)} className="inline-flex items-center rounded-lg bg-admin-bg px-2 py-0.5 font-body text-[11px] capitalize text-admin-text-muted">{t}</span>
                    ))}
                  </div>
                  <div className="mt-auto pt-4">
                    <div className="font-display text-2xl font-semibold leading-none tracking-tight tabular-nums text-admin-text">
                      {formatNaira(dailyAllIn(v, vatRate))}
                      <span className="ml-2 font-body text-xs font-medium text-admin-text-muted">/day, all-in</span>
                    </div>
                    <div className="mt-3 inline-flex items-center gap-1 font-body text-[13px] font-medium text-admin-green-text transition-transform group-hover:translate-x-1">
                      View &amp; book <ChevronRight className="h-3.5 w-3.5" />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <div className="mt-10 rounded-2xl border border-admin-border bg-admin-bg/50 px-6 py-4 font-body text-[13px] text-admin-text-muted">
        Prices include the car, a verified Avanti driver, and VAT. Fuel, tolls, and driver
        allowance on multi-day trips may be discussed at confirmation.
      </div>
    </div>
  );
}
