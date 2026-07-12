import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ClipboardList, Users, DollarSign, ShieldAlert } from 'lucide-react';
import { getAuthUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { SectionLabel } from '@/components/avanti/section-label';
import { SignOutButton } from '@/app/(customer)/sign-out-button';

/**
 * Admin home. Lists the modules an admin actor can access based on
 * their role. This is a placeholder until each module has a real
 * dashboard.
 */

export default async function AdminHomePage() {
  const user = await getAuthUser();
  if (!user) redirect('/sign-in');

  const isAdmin =
    user.roles.includes('admin_verifier') ||
    user.roles.includes('admin_support') ||
    user.roles.includes('admin_finance') ||
    user.roles.includes('admin_compliance') ||
    user.roles.includes('super_admin');
  if (!isAdmin) redirect('/sign-in');

  // Queue count for the summary card
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count: queueCount } = await (supabase as any)
    .from('v_verification_queue')
    .select('driver_id', { count: 'exact', head: true });

  const canVerify =
    user.roles.includes('admin_verifier') || user.roles.includes('super_admin');
  const canSupport =
    user.roles.includes('admin_support') || user.roles.includes('super_admin');
  const canFinance =
    user.roles.includes('admin_finance') || user.roles.includes('super_admin');
  const canCompliance =
    user.roles.includes('admin_compliance') || user.roles.includes('super_admin');

  return (
    <div className="mx-auto max-w-4xl px-4 pt-12 sm:px-6">
      <div className="mb-10 flex items-center justify-between">
        <div>
          <SectionLabel>Admin</SectionLabel>
          <h1 className="mt-2 font-display text-4xl leading-tight text-ink">
            <em className="italic">Operations.</em>
          </h1>
        </div>
        <SignOutButton />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {canVerify && (
          <ModuleCard
            href="/admin/verification"
            Icon={ClipboardList}
            title="Verification queue"
            description={`${queueCount ?? 0} pending`}
            emphasis={(queueCount ?? 0) > 0}
          />
        )}
        {canSupport && (
          <ModuleCard
            href="/admin/support"
            Icon={Users}
            title="Support tickets"
            description="Open tickets and escalations"
          />
        )}
        {canFinance && (
          <ModuleCard
            href="/admin/finance"
            Icon={DollarSign}
            title="Finance"
            description="Payouts, rate cards, tax rules"
          />
        )}
        {canCompliance && (
          <ModuleCard
            href="/admin/compliance"
            Icon={ShieldAlert}
            title="Compliance"
            description="Disputes, audit log, data requests"
          />
        )}
      </div>
    </div>
  );
}

function ModuleCard({
  href,
  Icon,
  title,
  description,
  emphasis,
}: {
  href: string;
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  description: string;
  emphasis?: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        'group flex items-start gap-4 border p-5 transition-colors hover:bg-paper-3 ' +
        (emphasis ? 'border-brass bg-brass-soft' : 'border-line-strong bg-paper-2')
      }
    >
      <div
        className={
          'flex h-10 w-10 shrink-0 items-center justify-center border ' +
          (emphasis ? 'border-brass bg-paper' : 'border-line-strong bg-paper')
        }
      >
        <Icon className="h-4 w-4 text-ink" strokeWidth={1.5} />
      </div>
      <div className="flex-1">
        <div className="font-display text-xl leading-none text-ink">{title}</div>
        <div className="mt-1 font-mono text-xs uppercase tracking-wider text-ink-muted">
          {description}
        </div>
      </div>
    </Link>
  );
}
