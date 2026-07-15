import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Search } from 'lucide-react';
import { getAuthUser } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { PageShell } from '@/components/avanti/page-shell';
import { SectionLabel } from '@/components/avanti/section-label';
import { cn } from '@/lib/utils/cn';

/**
 * Support console — operations view for admin_support / super_admin.
 *
 * Recent engagements across the platform (any status) plus a quick
 * user lookup section. Search functionality is placeholder-ish for
 * now; a real search endpoint comes later.
 */

const STATUS_STYLE: Record<string, string> = {
  draft: 'text-ink-muted',
  requested: 'text-ink',
  confirmed: 'text-brass',
  active: 'text-green',
  completed: 'text-ink-muted',
  cancelled: 'text-oxblood',
  disputed: 'text-oxblood',
  refunded: 'text-oxblood',
};

export default async function AdminSupportPage() {
  const user = await getAuthUser();
  if (!user) redirect('/sign-in');
  if (!user.roles.includes('admin_support') && !user.roles.includes('super_admin')) {
    redirect('/admin');
  }

  const admin = createServiceRoleClient();

  // Recent engagements across statuses
  const { data: engagements } = await admin
    .from('engagements')
    .select('id, status, engagement_type, starts_at, driver_id, customer_user_id, currency, customer_price_total, requested_at, confirmed_at, activated_at, completed_at, cancelled_at')
    .order('requested_at', { ascending: false })
    .limit(50);

  const recent = engagements ?? [];

  // Recent users
  const { data: usersData } = await admin
    .from('users')
    .select('id, full_name, phone, email, created_at')
    .order('created_at', { ascending: false })
    .limit(20);

  const users = usersData ?? [];

  // Names for engagements
  const driverIds = Array.from(new Set(recent.map((e) => e.driver_id).filter(Boolean)));
  const customerIds = Array.from(new Set(recent.map((e) => e.customer_user_id).filter(Boolean)));

  let driverNames: Record<string, string> = {};
  if (driverIds.length > 0) {
    const { data: drivers } = await admin
      .from('driver_profiles')
      .select('id, user_id')
      .in('id', driverIds as string[]);
    if (drivers) {
      const userIds = drivers.map((d) => d.user_id).filter(Boolean);
      const { data: driverUsers } = await admin
        .from('users')
        .select('id, full_name')
        .in('id', userIds as string[]);
      const um = Object.fromEntries((driverUsers ?? []).map((u) => [u.id, u.full_name ?? '—']));
      driverNames = Object.fromEntries(drivers.map((d) => [d.id, um[d.user_id ?? ''] ?? '—']));
    }
  }

  let customerNames: Record<string, string> = {};
  if (customerIds.length > 0) {
    const { data: customers } = await admin
      .from('users')
      .select('id, full_name')
      .in('id', customerIds as string[]);
    customerNames = Object.fromEntries(
      (customers ?? []).map((c) => [c.id, c.full_name ?? 'Customer'])
    );
  }

  const byStatus = {
    active: recent.filter((e) => ['active', 'confirmed'].includes(e.status ?? '')).length,
    total: recent.length,
    disputed: recent.filter((e) => ['disputed', 'partially_resolved'].includes(e.status ?? '')).length,
  };

  return (
    <PageShell>
      <div className="mx-auto max-w-6xl px-6 pt-8 pb-20">
        <Link
          href="/admin"
          className="mb-4 inline-flex items-center gap-1 font-mono text-xs uppercase tracking-wider text-ink-muted hover:text-ink"
        >
          <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
          Admin
        </Link>

        <SectionLabel>Support</SectionLabel>
        <h1 className="mb-10 mt-2 font-display text-4xl leading-tight text-ink md:text-5xl">
          <em className="italic">Operations desk.</em>
        </h1>

        {/* Stats */}
        <div className="mb-10 grid gap-6 md:grid-cols-3">
          <div className="border border-line bg-paper-2 p-6">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
              In flight
            </div>
            <div className="mt-3 font-display text-4xl leading-none text-ink">
              {byStatus.active}
            </div>
            <div className="mt-3 font-mono text-xs text-ink-muted">
              Active or confirmed engagements
            </div>
          </div>
          <div className="border border-line bg-paper-2 p-6">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
              Recent
            </div>
            <div className="mt-3 font-display text-4xl leading-none text-ink">
              {byStatus.total}
            </div>
            <div className="mt-3 font-mono text-xs text-ink-muted">
              Last 50 engagements
            </div>
          </div>
          <div
            className={cn(
              'border p-6',
              byStatus.disputed > 0
                ? 'border-2 border-oxblood bg-paper-2'
                : 'border-line bg-paper-2'
            )}
          >
            <div
              className={cn(
                'font-mono text-[10px] uppercase tracking-[0.2em]',
                byStatus.disputed > 0 ? 'text-oxblood' : 'text-ink-muted'
              )}
            >
              Needs attention
            </div>
            <div className="mt-3 font-display text-4xl leading-none text-ink">
              {byStatus.disputed}
            </div>
            <div className="mt-3 font-mono text-xs text-ink-muted">
              Disputes or partial resolutions
            </div>
          </div>
        </div>

        {/* Search placeholder */}
        <div className="mb-10 border border-line bg-paper-2 p-6">
          <div className="flex items-center gap-3">
            <Search className="h-5 w-5 text-ink-muted" strokeWidth={1.5} />
            <div>
              <div className="font-body text-sm text-ink">
                Look up an engagement or user
              </div>
              <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                Search coming in next round — use tables below for now
              </div>
            </div>
          </div>
        </div>

        {/* Engagements table */}
        <div className="mb-10">
          <SectionLabel>Recent engagements</SectionLabel>
          {recent.length === 0 ? (
            <div className="mt-4 border border-line bg-paper-2 px-6 py-10 text-center font-body text-sm text-ink-muted">
              No engagements yet.
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto border border-line">
              <table className="w-full">
                <thead className="border-b border-line bg-paper-2">
                  <tr>
                    <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                      Requested
                    </th>
                    <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                      Customer
                    </th>
                    <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                      Driver
                    </th>
                    <th className="px-4 py-3 text-right font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recent.slice(0, 25).map((e) => (
                    <tr key={e.id} className="border-b border-line last:border-0 hover:bg-paper-2">
                      <td className="px-4 py-3 font-mono text-xs text-ink-muted">
                        {e.requested_at
                          ? new Date(e.requested_at).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'short',
                              year: '2-digit',
                            })
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'font-mono text-[10px] uppercase tracking-wider',
                            STATUS_STYLE[e.status ?? ''] ?? 'text-ink-muted'
                          )}
                        >
                          {e.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-body text-sm text-ink">
                        {customerNames[e.customer_user_id ?? ''] ?? '—'}
                      </td>
                      <td className="px-4 py-3 font-body text-sm text-ink">
                        {driverNames[e.driver_id ?? ''] ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm text-ink">
                        ₦{Number(e.customer_price_total ?? 0).toLocaleString('en-NG')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Users table */}
        <div>
          <SectionLabel>Recent users · {users.length}</SectionLabel>
          {users.length === 0 ? (
            <div className="mt-4 border border-line bg-paper-2 px-6 py-10 text-center font-body text-sm text-ink-muted">
              No users yet.
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto border border-line">
              <table className="w-full">
                <thead className="border-b border-line bg-paper-2">
                  <tr>
                    <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                      Joined
                    </th>
                    <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                      Phone
                    </th>
                    <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                      Email
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-line last:border-0 hover:bg-paper-2">
                      <td className="px-4 py-3 font-mono text-xs text-ink-muted">
                        {u.created_at
                          ? new Date(u.created_at).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'short',
                              year: '2-digit',
                            })
                          : '—'}
                      </td>
                      <td className="px-4 py-3 font-body text-sm text-ink">
                        {u.full_name ?? '—'}
                      </td>
                      <td className="px-4 py-3 font-mono text-sm text-ink">
                        {u.phone ? `+${u.phone}` : '—'}
                      </td>
                      <td className="px-4 py-3 font-body text-sm text-ink-muted">
                        {u.email ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-10 border-l-2 border-brass bg-brass-soft px-6 py-5">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-brass">
            Coming
          </div>
          <p className="mt-2 max-w-2xl font-body text-sm leading-relaxed text-ink">
            Search endpoint (find users by phone, name, or engagement ID). Ticket system
            for tracked cases. Direct-messaging drivers or customers. Manual override for
            engagement state.
          </p>
        </div>
      </div>
    </PageShell>
  );
}
