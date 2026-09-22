import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Check, CarFront } from 'lucide-react';
import { getAuthUser } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { getPricingSettings } from '@/lib/pricing/settings';
import { AdminSectionLabel } from '@/components/avanti/admin/page-header';
import { CarHireBookingForm, type SafeVehicleDetail } from './booking-form';

export const dynamic = 'force-dynamic';

const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
function photoUrl(path: string | null): string | null {
  return path ? `${SUPA}/storage/v1/object/public/car-hire-vehicles/${path}` : null;
}

export default async function CarHireVehiclePage({ params }: { params: Promise<{ vehicleId: string }> }) {
  const { vehicleId } = await params;
  const user = await getAuthUser();
  if (!user) redirect(`/sign-in?next=/customer/car-hire/${vehicleId}`);

  const admin = createServiceRoleClient();
  const { vatRate } = await getPricingSettings();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: v } = await (admin as any)
    .from('hire_vehicles')
    .select('id, make, model, year, colour, vehicle_class, transmission, seats, features, city, photo_path, daily_rate, driver_daily_rate, included_hours_per_day, overtime_hourly_rate, min_days, status, is_active, deleted_at')
    .eq('id', vehicleId)
    .single();

  if (!v || v.status !== 'available' || !v.is_active || v.deleted_at) notFound();

  // Customer's contact to pre-fill.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: me } = await (admin as any).from('users').select('phone').eq('id', user.id).single();

  const vehicle: SafeVehicleDetail = {
    id: v.id,
    make: v.make,
    model: v.model,
    year: v.year,
    daily_rate: Number(v.daily_rate),
    driver_daily_rate: Number(v.driver_daily_rate),
    included_hours_per_day: Number(v.included_hours_per_day),
    overtime_hourly_rate: v.overtime_hourly_rate != null ? Number(v.overtime_hourly_rate) : null,
    min_days: Number(v.min_days),
  };

  const url = photoUrl(v.photo_path);
  const chips = [v.vehicle_class, v.transmission, v.seats ? `${v.seats} seats` : null, v.colour, v.city].filter(Boolean) as string[];

  return (
    <div className="mx-auto max-w-5xl px-6 pt-8 pb-20">
      <div className="mb-8 flex items-center gap-4">
        <Link href="/customer/car-hire" className="inline-flex items-center gap-1.5 font-body text-[13px] text-admin-text-muted transition-colors hover:text-admin-text">
          <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2} />
          All cars
        </Link>
        <Link href="/customer/car-hire/bookings" className="inline-flex items-center gap-1.5 font-body text-[13px] font-medium text-admin-text transition-colors hover:text-admin-green">
          Your requests
        </Link>
      </div>

      <div className="grid gap-10 md:grid-cols-5 md:gap-12">
        {/* Left: photo + specs */}
        <div className="md:col-span-2">
          <div className="aspect-[4/3] w-full overflow-hidden rounded-2xl border border-admin-border bg-admin-bg">
            {url ? <img src={url} alt={`${v.make} ${v.model}`} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-admin-text-muted"><CarFront className="h-12 w-12" strokeWidth={1.25} /></div>}
          </div>

          <div className="mt-6">
            <AdminSectionLabel>Included</AdminSectionLabel>
            <ul className="mt-3 space-y-2 font-body text-sm text-admin-text">
              {[
                `A verified Avanti driver`,
                `${vehicle.included_hours_per_day} hours of use per day`,
                ...(Array.isArray(v.features) ? v.features : []),
              ].map((item: string) => (
                <li key={item} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-admin-green-text" strokeWidth={2} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right: title + booking form */}
        <div className="md:col-span-3">
          <AdminSectionLabel>Car hire · car + driver</AdminSectionLabel>
          <h1 className="mt-2 font-display text-4xl font-semibold leading-tight tracking-tight text-admin-text">
            {v.make} {v.model}{v.year ? ` · ${v.year}` : ''}
          </h1>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {chips.map((t) => (
              <span key={t} className="inline-flex items-center rounded-lg bg-admin-bg px-2.5 py-1 font-body text-[12px] capitalize text-admin-text-muted">{t}</span>
            ))}
          </div>

          <div className="mt-8">
            <CarHireBookingForm vehicle={vehicle} defaultPhone={me?.phone ?? ''} vatRate={vatRate} />
          </div>
        </div>
      </div>
    </div>
  );
}
