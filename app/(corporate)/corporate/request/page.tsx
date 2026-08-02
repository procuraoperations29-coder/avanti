import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { getAuthUser } from '@/lib/auth';
import { DriverRequestForm } from './request-form';

export default async function CorporateRequestPage() {
  const user = await getAuthUser();
  if (!user) redirect('/sign-in');
  if (!user.roles.includes('corporate_admin') && !user.roles.includes('corporate_member')) {
    redirect('/sign-in');
  }
  if (!user.activeOrganizationId) redirect('/corporate');

  return (
    <div className="mx-auto max-w-2xl px-4 pt-8 pb-20 sm:px-6">
      <Link
        href="/corporate"
        className="mb-6 inline-flex items-center gap-1.5 font-body text-[13px] text-admin-text-muted transition-colors hover:text-admin-text"
      >
        <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2} />
        Dashboard
      </Link>

      <div className="mb-8">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-admin-text md:text-4xl">
          Request drivers
        </h1>
        <p className="mt-3 max-w-2xl font-body leading-relaxed text-admin-text-muted">
          Tell us how many drivers you need and what for. We&apos;ll source and vet them, then assign
          them to your account — you manage them from your dashboard.
        </p>
      </div>

      <DriverRequestForm />
    </div>
  );
}
