import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { getAuthUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { SectionLabel } from '@/components/avanti/section-label';
import { BookingForm } from '@/components/customer/booking-form';

export default async function BookDriverPage({
  params,
}: {
  params: Promise<{ driverId: string }>;
}) {
  const { driverId } = await params;

  const user = await getAuthUser();
  if (!user) redirect('/sign-in');

  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: driver } = await (supabase as any)
    .from('v_public_driver_summary')
    .select('driver_id, full_name, vehicle_class_experience')
    .eq('driver_id', driverId)
    .single();

  if (!driver) notFound();

  const classes: string[] = driver.vehicle_class_experience ?? ['sedan'];

  return (
    <div className="mx-auto max-w-5xl px-4 pt-8 sm:px-6 pb-24">
      <Link
        href={`/customer/drivers/${driverId}`}
        className="mb-4 inline-flex items-center gap-1 font-mono text-xs uppercase tracking-wider text-ink-muted hover:text-ink"
      >
        <ChevronLeft className="h-3.5 w-3.5" /> Back
      </Link>

      <SectionLabel>Book</SectionLabel>
      <h1 className="mb-8 mt-2 font-display text-4xl leading-tight text-ink">
        {driver.full_name}
      </h1>

      <BookingForm driverId={driverId} driverName={driver.full_name} availableClasses={classes} />
    </div>
  );
}
