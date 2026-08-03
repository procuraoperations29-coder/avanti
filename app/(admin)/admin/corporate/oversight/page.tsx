import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { AdminPageHeader, MiniStat, AdminSectionLabel } from '@/components/avanti/admin/page-header';
import { PayoutMarkPaid } from './payout-actions';
import { InvoiceMarkPaid } from './invoice-actions';

function formatNaira(n: number): string {
  return `₦${Math.round(n).toLocaleString('en-NG')}`;
}
function monthLabel(d: string): string {
  return new Date(d).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
}
function fmtDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

const INV_PILL: Record<string, string> = {
  pending: 'bg-admin-amber-soft text-admin-amber-text',
  paid: 'bg-admin-green-soft text-admin-green-text',
  overdue: 'bg-red-500/12 text-red-600',
  cancelled: 'bg-admin-bg text-admin-text-muted',
};

export default async function CorporateOversightPage() {
  const user = await getAuthUser();
  if (!user) redirect('/sign-in');
  const canAccess =
    user.roles.includes('admin_support') ||
    user.roles.includes('admin_finance') ||
    user.roles.includes('super_admin');
  if (!canAccess) redirect('/admin');
  const canPay = user.roles.includes('admin_finance') || user.roles.includes('super_admin');

  const admin = createServiceRoleClient();

  // Invoices
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: invRows } = await (admin as any)
    .from('corporate_invoices')
    .select('id, organization_id, kind, period_month, amount, status, payment_status, created_at')
    .order('created_at', { ascending: false })
    .limit(100);
  const invoices = invRows ?? [];

  // Payouts
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: payoutRows } = await (admin as any)
    .from('corporate_payouts')
    .select('id, driver_id, organization_id, period_month, base_amount, overtime_hours, overtime_amount, total, status')
    .order('period_month', { ascending: false })
    .limit(200);
  const payouts = payoutRows ?? [];

  // Names
  const orgIds = Array.from(new Set([...invoices, ...payouts].map((r: { organization_id: string }) => r.organization_id)));
  let orgNames: Record<string, string> = {};
  if (orgIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: orgs } = await (admin as any).from('organizations').select('id, name').in('id', orgIds);
    orgNames = Object.fromEntries((orgs ?? []).map((o: { id: string; name: string }) => [o.id, o.name]));
  }
  const driverIds = Array.from(new Set(payouts.map((p: { driver_id: string }) => p.driver_id)));
  let driverNames: Record<string, string> = {};
  if (driverIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profs } = await (admin as any).from('driver_profiles').select('id, user_id').in('id', driverIds);
    const uids = (profs ?? []).map((p: { user_id: string | null }) => p.user_id).filter(Boolean);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: us } = uids.length ? await (admin as any).from('users').select('id, full_name').in('id', uids) : { data: [] };
    const byUser = Object.fromEntries((us ?? []).map((u: { id: string; full_name: string | null }) => [u.id, u.full_name ?? 'Driver']));
    driverNames = Object.fromEntries((profs ?? []).map((p: { id: string; user_id: string | null }) => [p.id, byUser[p.user_id ?? ''] ?? 'Driver']));
  }

  const unpaidInvoiceTotal = invoices
    .filter((i: { payment_status: string }) => i.payment_status === 'unpaid')
    .reduce((s: number, i: { amount: number }) => s + Number(i.amount ?? 0), 0);
  const pendingPayoutTotal = payouts
    .filter((p: { status: string }) => p.status === 'pending')
    .reduce((s: number, p: { total: number }) => s + Number(p.total ?? 0), 0);

  return (
    <>
      <AdminPageHeader
        backHref="/admin/corporate"
        backLabel="Corporate"
        title="Finance & payouts"
        subtitle="Money in (org invoices) and money out (driver payouts)"
      />

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MiniStat label="Unpaid invoices" value={formatNaira(unpaidInvoiceTotal)} />
        <MiniStat label="Pending payouts" value={formatNaira(pendingPayoutTotal)} />
        <MiniStat label="Invoices" value={invoices.length} />
        <MiniStat label="Payouts" value={payouts.length} />
      </div>

      {/* Invoices */}
      <div className="mb-10">
        <AdminSectionLabel>Org invoices</AdminSectionLabel>
        {invoices.length === 0 ? (
          <div className="rounded-2xl border border-admin-border bg-admin-card px-6 py-10 text-center font-body text-sm text-admin-text-muted shadow-admin-sm">
            No invoices yet.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-admin-border bg-admin-card shadow-admin-sm">
            {invoices.map((i: { id: string; organization_id: string; kind: string; period_month: string | null; amount: number; status: string; payment_status: string }) => (
              <div key={i.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-admin-border px-5 py-3.5 last:border-0">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-body text-sm font-medium text-admin-text">{orgNames[i.organization_id] ?? 'Org'}</span>
                    <span className="font-body text-[12px] uppercase tracking-wide text-admin-text-muted">
                      {i.kind}{i.period_month ? ` · ${monthLabel(i.period_month)}` : ''}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-body text-sm font-semibold tabular-nums text-admin-text">{formatNaira(Number(i.amount ?? 0))}</span>
                  <span className={'inline-flex items-center rounded-full px-2 py-0.5 font-body text-[11px] font-medium uppercase tracking-wide ' + (INV_PILL[i.status] ?? 'bg-admin-bg text-admin-text-muted')}>
                    {i.status}
                  </span>
                  {i.payment_status === 'unpaid' && canPay && <InvoiceMarkPaid invoiceId={i.id} kind={i.kind} />}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payouts */}
      <div>
        <AdminSectionLabel>Driver payouts</AdminSectionLabel>
        {payouts.length === 0 ? (
          <div className="rounded-2xl border border-admin-border bg-admin-card px-6 py-10 text-center font-body text-sm text-admin-text-muted shadow-admin-sm">
            No payouts yet — they generate with each month&apos;s billing.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-admin-border bg-admin-card shadow-admin-sm">
            {payouts.map((p: { id: string; driver_id: string; organization_id: string; period_month: string; base_amount: number; overtime_hours: number; overtime_amount: number; total: number; status: string }) => (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-admin-border px-5 py-3.5 last:border-0">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-body text-sm font-medium text-admin-text">{driverNames[p.driver_id] ?? 'Driver'}</span>
                    <span className="font-body text-[12px] text-admin-text-muted">
                      {orgNames[p.organization_id] ?? 'Org'} · {monthLabel(p.period_month)}
                    </span>
                  </div>
                  <div className="mt-0.5 font-body text-[12px] tabular-nums text-admin-text-muted">
                    Base {formatNaira(Number(p.base_amount ?? 0))}
                    {Number(p.overtime_amount ?? 0) > 0 && ` · OT ${formatNaira(Number(p.overtime_amount))} (${p.overtime_hours}h)`}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-body text-sm font-semibold tabular-nums text-admin-text">{formatNaira(Number(p.total ?? 0))}</span>
                  {p.status === 'paid' ? (
                    <span className="inline-flex items-center rounded-full bg-admin-green-soft px-2 py-0.5 font-body text-[11px] font-medium uppercase tracking-wide text-admin-green-text">
                      Paid
                    </span>
                  ) : canPay ? (
                    <PayoutMarkPaid payoutId={p.id} />
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-admin-amber-soft px-2 py-0.5 font-body text-[11px] font-medium uppercase tracking-wide text-admin-amber-text">
                      Pending
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
