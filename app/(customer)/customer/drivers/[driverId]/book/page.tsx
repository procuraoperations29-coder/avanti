import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { getAuthUser } from '@/lib/auth';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { AdminSectionLabel } from '@/components/avanti/admin/page-header';
import { BookingForm } from '@/components/customer/booking-form';

/**
 * Booking page.
 *
 * The vehicle-class dropdown now shows only classes that satisfy BOTH:
 *   1. Driver actually drives that class (vehicle_class_experience)
 *   2. There's a price rule matching the driver's tier for that class
 *
 * This prevents the "no_matching_rule" error that happened when a T2
 * driver's dropdown offered "executive" (T3+ only).
 */

export default async function BookDriverPage({
  params,
}: {
  params: Promise<{ driverId: string }>;
}) {
  const { driverId } = await params;

  const user = await getAuthUser();
  if (!user) redirect('/sign-in');

  const supabase = await createClient();
  const { data: driver } = await supabase
    .from('v_public_driver_summary')
    .select('driver_id, full_name, vehicle_class_experience, verification_tier')
    .eq('driver_id', driverId)
    .single();

  if (!driver) notFound();

  const driverClasses: string[] = driver.vehicle_class_experience ?? ['sedan'];
  const driverTier = driver.verification_tier;

  // Figure out which classes have a matching price rule at this tier.
  const admin = createServiceRoleClient();
  const { data: rateCard } = await admin
    .from('rate_cards')
    .select('id')
    .eq('country_code', 'NG')
    .eq('status', 'published')
    .order('effective_from', { ascending: false })
    .limit(1)
    .single();

  let priceableClasses: string[] = driverClasses;

  if (rateCard && driverTier) {
    const { data: rules } = await admin
      .from('price_rules')
      .select('vehicle_class')
      .eq('rate_card_id', rateCard.id)
      .lte('min_verification_tier', driverTier)
      .in('vehicle_class', driverClasses);

    if (rules) {
      const priceableSet = new Set(rules.map((r) => r.vehicle_class));
      priceableClasses = driverClasses.filter((c) => priceableSet.has(c));
    }
  }

  // Fallback — if nothing filters (rules query failed etc.), fall back
  // to the driver's experience array so the user isn't stuck.
  if (priceableClasses.length === 0) {
    priceableClasses = driverClasses.length > 0 ? driverClasses : ['sedan'];
  }

  return (
    <div className="mx-auto max-w-5xl px-4 pt-8 sm:px-6 pb-24">
      <Link
        href={`/customer/drivers/${driverId}`}
        className="mb-4 inline-flex items-center gap-1.5 font-body text-[13px] text-admin-text-muted transition-colors hover:text-admin-text"
      >
        <ChevronLeft className="h-3.5 w-3.5" /> Back
      </Link>

      <AdminSectionLabel>Book</AdminSectionLabel>
      <h1 className="mb-8 mt-2 font-display text-4xl font-semibold leading-tight tracking-tight text-admin-text">
        {driver.full_name}
      </h1>

      <BookingForm
        driverId={driverId}
        driverName={driver.full_name!}
        availableClasses={priceableClasses}
      />
    </div>
  );
}
