import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { AdminPageHeader } from '@/components/avanti/admin/page-header';
import { PartnersClient, type PartnerRow } from './partners-client';

export const dynamic = 'force-dynamic';

export default async function CarHirePartnersPage() {
  const user = await getAuthUser();
  if (!user) redirect('/sign-in');
  const canView =
    user.roles.includes('admin_finance') || user.roles.includes('admin_support') || user.roles.includes('super_admin');
  if (!canView) redirect('/admin');

  const admin = createServiceRoleClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (admin as any)
    .from('leasing_partners')
    .select('id, name, legal_name, contact_name, contact_phone, contact_email, city, status, notes, bank_name, bank_code, account_number_last4, account_holder_name')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  return (
    <>
      <AdminPageHeader
        backHref="/admin/car-hire"
        backLabel="Car hire"
        title="Leasing partners"
        subtitle="The vehicle-supply companies Avanti hires cars from"
      />
      <PartnersClient initial={(data ?? []) as PartnerRow[]} />
    </>
  );
}
