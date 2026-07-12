import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import { SectionLabel } from '@/components/avanti/section-label';
import { SignOutButton } from '../sign-out-button';

/**
 * Customer home. Placeholder — real dashboard lands in Slice 6 (booking).
 */
export default async function CustomerHomePage() {
  const user = await getAuthUser();
  if (!user) redirect('/sign-in');
  if (!user.roles.includes('individual_customer')) redirect('/sign-in');

  return (
    <div className="mx-auto max-w-3xl px-4 pt-12 sm:px-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <SectionLabel>Signed in · {user.phone}</SectionLabel>
          <h1 className="mt-3 font-display text-4xl leading-tight text-ink">
            Welcome, <em className="italic">customer</em>.
          </h1>
        </div>
        <SignOutButton />
      </div>

      <p className="max-w-xl font-body text-ink-muted">
        This is your dashboard. Booking flow lands in the next slice.
      </p>

      <div className="mt-8 border border-line bg-paper-2 p-5">
        <SectionLabel>Debug — your claims</SectionLabel>
        <pre className="mt-3 whitespace-pre-wrap font-mono text-xs text-ink">
{JSON.stringify(
  {
    id: user.id,
    phone: user.phone,
    email: user.email,
    roles: user.roles,
    activeRole: user.activeRole,
    organizationIds: user.organizationIds,
    verificationTier: user.verificationTier,
    aal: user.aal,
  },
  null,
  2
)}
        </pre>
      </div>
    </div>
  );
}
