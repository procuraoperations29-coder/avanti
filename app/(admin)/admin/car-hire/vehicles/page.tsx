import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { getPricingSettings } from '@/lib/pricing/settings';
import { AdminPageHeader } from '@/components/avanti/admin/page-header';
import { VehiclesClient, type VehicleRow, type PartnerOption } from './vehicles-client';

export const dynamic = 'force-dynamic';

export default async function CarHireVehiclesPage() {
  const user = await getAuthUser();
  if (!user) redirect('/sign-in');
  const canView =
    user.roles.includes('admin_finance') || user.roles.includes('admin_support') || user.roles.includes('super_admin');
  if (!canView) redirect('/admin');

  const admin = createServiceRoleClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const A = admin as any;

  const { data: vehicles } = await A.from('hire_vehicles')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  const { data: partners } = await A.from('leasing_partners')
    .select('id, name, status')
    .is('deleted_at', null)
    .order('name');

  const { vatRate } = await getPricingSettings();
  const partnerRows = (partners ?? []) as Array<{ id: string; name: string; status: string }>;
  const activePartners: PartnerOption[] = partnerRows.filter((p) => p.status === 'active').map((p) => ({ id: p.id, name: p.name }));
  const partnerNames: Record<string, string> = Object.fromEntries(partnerRows.map((p) => [p.id, p.name]));

  return (
    <>
      <AdminPageHeader
        backHref="/admin/car-hire"
        backLabel="Car hire"
        title="Hire vehicles"
        subtitle="Cars available for hire, their partner, and their pricing"
      />
      <VehiclesClient
        initial={(vehicles ?? []) as VehicleRow[]}
        partners={activePartners}
        partnerNames={partnerNames}
        vatRate={vatRate}
      />
    </>
  );
}
