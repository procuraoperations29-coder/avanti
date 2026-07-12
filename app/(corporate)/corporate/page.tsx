import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import { SectionLabel } from '@/components/avanti/section-label';
import { SignOutButton } from '@/app/(customer)/sign-out-button';

/**
 * Corporate landing. Real dashboard lands in a later slice (corporate flows).
 * For now, shows the org verification state.
 */
export default async function CorporateHomePage() {
  const user = await getAuthUser();
  if (!user) redirect('/sign-in');

  const isCorporate = user.roles.includes('corporate_admin') || user.roles.includes('corporate_member');
  if (!isCorporate) redirect('/sign-in');

  return (
    <div className="mx-auto max-w-3xl px-4 pt-12 sm:px-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <SectionLabel>Signed in · corporate</SectionLabel>
          <h1 className="mt-3 font-display text-4xl leading-tight text-ink">
            <em className="italic">Organisation verification pending.</em>
          </h1>
        </div>
        <SignOutButton />
      </div>

      <div className="mb-6 border border-brass bg-brass-soft p-5">
        <SectionLabel>What&apos;s next</SectionLabel>
        <p className="mt-3 font-body text-ink">
          A member of our team is reviewing your organisation&apos;s registration details. This
          usually takes a business day. You&apos;ll receive an email at your billing address when
          verification is complete.
        </p>
      </div>

      <div className="border border-line bg-paper-2 p-5">
        <SectionLabel>Debug — your claims</SectionLabel>
        <pre className="mt-3 whitespace-pre-wrap font-mono text-xs text-ink">
{JSON.stringify(
  {
    id: user.id,
    roles: user.roles,
    activeRole: user.activeRole,
    organizationIds: user.organizationIds,
    activeOrganizationId: user.activeOrganizationId,
  },
  null,
  2
)}
        </pre>
      </div>
    </div>
  );
}
