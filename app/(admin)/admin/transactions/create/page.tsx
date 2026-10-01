import { redirect } from 'next/navigation';
import { getAuthUser, hasPermission } from '@/lib/auth';
import { AdminPageHeader } from '@/components/avanti/admin/page-header';
import { CreateTransactionForm } from '@/components/admin/create-transaction-form';

export default async function CreateTransactionPage() {
  const user = await getAuthUser();
  if (!user) redirect('/sign-in');
  if (!hasPermission(user.roles, 'bookings.create_admin')) {
    redirect('/admin');
  }

  return (
    <div className="pb-24">
      <AdminPageHeader
        backHref="/admin"
        backLabel="Admin"
        title="Create Transaction"
        subtitle="Create an on-demand driver or car hire booking for a customer"
      />

      <div className="mx-auto max-w-2xl px-6">
        <CreateTransactionForm />
      </div>
    </div>
  );
}
