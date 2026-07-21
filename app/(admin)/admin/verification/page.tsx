import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, Clock, User } from 'lucide-react';
import { getAuthUser, hasPermission } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { PageShell } from '@/components/avanti/page-shell';
import { AdminSidebar } from '@/components/avanti/admin/admin-sidebar';
import { EmptyState } from '@/components/avanti/empty-state';

/**
 * Verification queue. Reads from v_verification_queue view (Slice 2).
 */

export default async function VerificationQueuePage() {
  const user = await getAuthUser();
  if (!user) redirect('/sign-in');
  if (!hasPermission(user.roles, 'verification.queue.read')) {
    redirect('/admin');
  }

  const isSuper = user.roles.includes('super_admin');
  const canVerify = user.roles.includes('admin_verifier') || isSuper;
  const canSupport = user.roles.includes('admin_support') || isSuper;
  const canFinance = user.roles.includes('admin_finance') || isSuper;
  const canCompliance = user.roles.includes('admin_compliance') || isSuper;

  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: items } = await (supabase as any)
    .from('v_verification_queue')
    .select('*')
    .order('submitted_at', { ascending: true, nullsFirst: false });

  return (
    <PageShell>
      <div className="flex bg-admin-bg" style={{ minHeight: 'calc(100vh - 64px)' }}>
        <AdminSidebar
          active="verification"
          canVerify={canVerify}
          canPlacements={canSupport || canVerify}
          canSupport={canSupport}
          canFinance={canFinance}
          canCompliance={canCompliance}
          isSuper={isSuper}
        />

        <div className="min-w-0 flex-1 px-6 py-6 sm:px-8">
          <Link
            href="/admin"
            className="mb-4 inline-block font-body text-[13px] text-admin-text-muted hover:text-admin-text"
          >
            ← Admin
          </Link>
          <p className="font-body text-lg font-medium text-admin-text">
            Verification queue
          </p>
          <p className="mt-0.5 mb-6 font-body text-[13px] text-admin-text-muted">
            {items?.length ?? 0} driver{(items?.length ?? 0) === 1 ? '' : 's'} pending
          </p>

          {!items || items.length === 0 ? (
            <div className="rounded-xl border border-admin-border bg-admin-card">
              <EmptyState
                Icon={Clock}
                title="Queue is clear"
                description="No drivers are waiting for verification right now."
              />
            </div>
          ) : (
            <ul className="overflow-hidden rounded-xl border border-admin-border bg-admin-card">
              {items.map((item: {
                driver_id: string;
                full_name: string;
                phone: string;
                country_code: string;
                verification_status: string;
                submitted_at: string | null;
                active_document_count: number;
              }) => {
                const waitingSince = item.submitted_at
                  ? new Date(item.submitted_at).toLocaleString()
                  : '—';
                return (
                  <li key={item.driver_id} className="border-b border-admin-border last:border-b-0">
                    <Link
                      href={`/admin/verification/${item.driver_id}`}
                      className="flex items-center gap-4 p-4 transition-colors hover:bg-admin-bg"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-admin-bg">
                        <User className="h-4 w-4 text-admin-text-muted" strokeWidth={1.75} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-body text-sm text-admin-text">{item.full_name}</div>
                        <div className="font-body text-[12px] text-admin-text-muted">
                          {item.phone} · {item.country_code}
                        </div>
                      </div>
                      <div className="hidden text-right sm:block">
                        <div className="font-body text-[12px] font-medium capitalize text-admin-text">
                          {item.verification_status.replace(/_/g, ' ')}
                        </div>
                        <div className="mt-0.5 font-body text-[11px] text-admin-text-muted">
                          {item.active_document_count} documents
                        </div>
                      </div>
                      <div className="hidden min-w-[8rem] text-right sm:block">
                        <div className="font-body text-[11px] text-admin-text-muted">Submitted</div>
                        <div className="mt-0.5 font-body text-[12px] text-admin-text">{waitingSince}</div>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-admin-text-muted" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </PageShell>
  );
}
