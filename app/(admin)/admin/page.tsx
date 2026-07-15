import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  ClipboardList,
  Users,
  DollarSign,
  ShieldAlert,
  LayoutGrid,
  UserCheck,
} from 'lucide-react';
import { getAuthUser } from '@/lib/auth';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { PageShell } from '@/components/avanti/page-shell';
import { SectionLabel } from '@/components/avanti/section-label';

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

  const supabase = await createClient();
  const { count: queueCount } = await supabase
    .from('v_verification_queue')
    .select('driver_id', { count: 'exact', head: true });

  // New enquiries count for placements card
  const admin = createServiceRoleClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count: newEnquiryCount } = await (admin as any)
    .from('placement_enquiries')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'new');

  const isSuper = user.roles.includes('super_admin');
  const canVerify = user.roles.includes('admin_verifier') || isSuper;
  const canSupport = user.roles.includes('admin_support') || isSuper;
  const canFinance = user.roles.includes('admin_finance') || isSuper;
  const canCompliance = user.roles.includes('admin_compliance') || isSuper;
  const canPlacements = canSupport || canVerify;

  return (
    <PageShell>
      <div className="mx-auto max-w-4xl px-4 pt-8 sm:px-6 pb-20">
        <div className="mb-10">
          <SectionLabel>Admin</SectionLabel>
          <h1 className="mt-2 font-display text-4xl leading-tight text-ink">
            <em className="italic">Operations.</em>
          </h1>
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
          {canPlacements && (
            <ModuleCard
              href="/admin/placements"
              Icon={UserCheck}
              title="Placements"
              description={
                (newEnquiryCount ?? 0) > 0
                  ? `${newEnquiryCount} new enquiries`
                  : 'Permanent driver enquiries'
              }
              emphasis={(newEnquiryCount ?? 0) > 0}
            />
          )}
          {canSupport && (
            <ModuleCard
              href="/admin/support"
              Icon={Users}
              title="Support"
              description="Engagements, users, escalations"
            />
          )}
          {canFinance && (
            <ModuleCard
              href="/admin/finance"
              Icon={DollarSign}
              title="Finance"
              description="Revenue, payouts, batches"
            />
          )}
          {canCompliance && (
            <ModuleCard
              href="/admin/compliance"
              Icon={ShieldAlert}
              title="Compliance"
              description="Audit log, decisions, disputes"
            />
          )}
        </div>

        {isSuper && (
          <div className="mt-10">
            <SectionLabel>Super admin</SectionLabel>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <ModuleCard
                href="/admin/system"
                Icon={LayoutGrid}
                title="System overview"
                description="Users, tiers, engagements, revenue at a glance"
              />
            </div>
          </div>
        )}
      </div>
    </PageShell>
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
