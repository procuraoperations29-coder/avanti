import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { AdminPageHeader, MiniStat } from '@/components/avanti/admin/page-header';
import { formatNaira } from '@/lib/permanent/salary';
import { SettleButton } from './settle-button';

export const dynamic = 'force-dynamic';

interface Group {
  key: string;
  name: string;
  owed: number;
  settled: number;
  unsettledIds: string[];
  unsettledCount: number;
}

function groupBy(
  rows: Array<Record<string, unknown>>,
  idField: string,
  amountField: string,
  statusField: string,
  nameMap: Record<string, string>,
): Group[] {
  const map = new Map<string, Group>();
  for (const r of rows) {
    const key = r[idField] ? String(r[idField]) : 'unassigned';
    const amount = Number(r[amountField] ?? 0);
    const settled = r[statusField] === 'settled';
    let g = map.get(key);
    if (!g) {
      g = { key, name: nameMap[key] ?? (key === 'unassigned' ? 'Unassigned' : '—'), owed: 0, settled: 0, unsettledIds: [], unsettledCount: 0 };
      map.set(key, g);
    }
    if (settled) g.settled += amount;
    else { g.owed += amount; g.unsettledIds.push(String(r.id)); g.unsettledCount += 1; }
  }
  return Array.from(map.values()).sort((a, b) => b.owed - a.owed);
}

export default async function CarHireSettlementsPage() {
  const user = await getAuthUser();
  if (!user) redirect('/sign-in');
  const canView =
    user.roles.includes('admin_finance') || user.roles.includes('admin_support') || user.roles.includes('super_admin');
  if (!canView) redirect('/admin');

  const admin = createServiceRoleClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const A = admin as any;

  // Only customer-paid bookings create a payable.
  const { data } = await A.from('car_hire_bookings')
    .select('id, partner_id, assigned_driver_id, partner_cost_total, driver_pay_total, partner_settlement_status, driver_settlement_status')
    .in('payment_status', ['paid', 'manual_paid'])
    .is('deleted_at', null);
  const rows = (data ?? []) as Array<Record<string, unknown>>;

  // Names.
  const partnerIds = Array.from(new Set(rows.map((r) => r.partner_id).filter(Boolean))) as string[];
  const driverIds = Array.from(new Set(rows.map((r) => r.assigned_driver_id).filter(Boolean))) as string[];
  const [{ data: partners }, { data: driverProfiles }] = await Promise.all([
    partnerIds.length ? A.from('leasing_partners').select('id, name').in('id', partnerIds) : Promise.resolve({ data: [] }),
    driverIds.length ? A.from('driver_profiles').select('id, user_id').in('id', driverIds) : Promise.resolve({ data: [] }),
  ]);
  const partnerName: Record<string, string> = Object.fromEntries((partners ?? []).map((p: { id: string; name: string }) => [p.id, p.name]));
  const dpUserIds = (driverProfiles ?? []).map((d: { user_id: string }) => d.user_id);
  const { data: dUsers } = dpUserIds.length ? await A.from('users').select('id, full_name').in('id', dpUserIds) : { data: [] };
  const uName: Record<string, string> = Object.fromEntries((dUsers ?? []).map((u: { id: string; full_name: string | null }) => [u.id, u.full_name ?? 'Driver']));
  const driverName: Record<string, string> = Object.fromEntries((driverProfiles ?? []).map((d: { id: string; user_id: string }) => [d.id, uName[d.user_id] ?? 'Driver']));

  const partnerGroups = groupBy(rows, 'partner_id', 'partner_cost_total', 'partner_settlement_status', partnerName);
  const driverGroups = groupBy(rows, 'assigned_driver_id', 'driver_pay_total', 'driver_settlement_status', driverName);

  const totalPartnerOwed = partnerGroups.reduce((s, g) => s + g.owed, 0);
  const totalDriverOwed = driverGroups.reduce((s, g) => s + g.owed, 0);

  return (
    <>
      <AdminPageHeader
        backHref="/admin/car-hire"
        backLabel="Car hire"
        title="Settlements"
        subtitle="What Avanti owes leasing partners and drivers on paid car hires"
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MiniStat label="Owed to partners" value={formatNaira(totalPartnerOwed)} />
        <MiniStat label="Owed to drivers" value={formatNaira(totalDriverOwed)} />
        <MiniStat label="Partners with balance" value={partnerGroups.filter((g) => g.owed > 0).length} />
        <MiniStat label="Drivers with balance" value={driverGroups.filter((g) => g.owed > 0).length} />
      </div>

      <LedgerSection title="Partner payables" kind="partner" groups={partnerGroups} />
      <div className="mt-8" />
      <LedgerSection title="Driver payables (car hire)" kind="driver" groups={driverGroups} />
    </>
  );
}

function LedgerSection({ title, kind, groups }: { title: string; kind: 'partner' | 'driver'; groups: Group[] }) {
  const withBalance = groups.filter((g) => g.owed > 0 || g.settled > 0);
  return (
    <div>
      <h2 className="mb-3 font-body text-sm font-semibold text-admin-text">{title}</h2>
      {withBalance.length === 0 ? (
        <div className="rounded-2xl border border-admin-border bg-admin-card px-6 py-8 text-center font-body text-sm text-admin-text-muted shadow-admin-sm">
          Nothing to settle yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-admin-border bg-admin-card shadow-admin-sm">
          {withBalance.map((g) => (
            <div key={g.key} className="flex flex-col gap-3 border-b border-admin-border px-5 py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="truncate font-body text-sm font-semibold text-admin-text">{g.name}</div>
                <div className="mt-0.5 font-body text-[12px] text-admin-text-muted">
                  {g.unsettledCount > 0 ? `${g.unsettledCount} unsettled` : 'all settled'}
                  {g.settled > 0 && ` · ${formatNaira(g.settled)} settled`}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-4">
                <div className="text-right">
                  <div className="font-display text-lg font-semibold tabular-nums text-admin-text">{formatNaira(g.owed)}</div>
                  <div className="font-body text-[10px] uppercase tracking-wide text-admin-text-muted">owed</div>
                </div>
                {g.unsettledIds.length > 0 && (
                  <SettleButton kind={kind} bookingIds={g.unsettledIds} label={`Mark ${formatNaira(g.owed)} paid`} />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
