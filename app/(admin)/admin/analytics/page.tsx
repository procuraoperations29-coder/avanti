import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { AdminPageHeader, AdminSectionLabel, MiniStat } from '@/components/avanti/admin/page-header';
import { GrowthChart } from '@/components/avanti/admin/growth-chart';
import { detectAnomalies } from '@/lib/analytics/anomalies';

export const dynamic = 'force-dynamic';

const ALERT_STYLE: Record<string, string> = {
  high: 'border-red-500/30 bg-red-500/10 text-red-700',
  medium: 'border-admin-amber/40 bg-admin-amber-soft text-admin-amber-text',
  info: 'border-admin-green/30 bg-admin-green-soft text-admin-green-text',
};

function monthKeyOf(d: Date): number { return d.getUTCFullYear() * 12 + d.getUTCMonth(); }
function monthLabelOf(mk: number): string {
  const y = Math.floor(mk / 12); const m = mk % 12;
  return new Date(Date.UTC(y, m, 1)).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
}

export default async function AnalyticsPage() {
  const user = await getAuthUser();
  if (!user) redirect('/sign-in');
  const isSuper = user.roles.includes('super_admin');
  const canView = isSuper || user.roles.includes('admin_finance') || user.roles.includes('admin_support');
  if (!canView) redirect('/admin');

  const admin = createServiceRoleClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const A = admin as any;

  // Exclude internal staff — analytics is about platform users, not employees.
  const { data: staffRows } = await A.from('user_roles').select('user_id').in('role', ['admin_verifier', 'admin_support', 'admin_finance', 'admin_compliance', 'super_admin']).is('revoked_at', null);
  const staffSet = new Set((staffRows ?? []).map((r: { user_id: string }) => r.user_id));
  const { data: usersData } = await A.from('users').select('id, created_at, country_code, deleted_at');
  const users: { id: string; created_at: string; country_code: string | null; deleted_at: string | null }[] = (usersData ?? []).filter((u: { id: string }) => !staffSet.has(u.id));

  // ── User growth: last 12 weeks (new + cumulative) ──
  const now = new Date();
  const weeks: { start: number; end: number; label: string; value: number; cumulative: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const end = new Date(now); end.setDate(now.getDate() - i * 7); end.setHours(23, 59, 59, 999);
    const start = new Date(end); start.setDate(end.getDate() - 6); start.setHours(0, 0, 0, 0);
    weeks.push({ start: start.getTime(), end: end.getTime(), label: `${start.getDate()}/${start.getMonth() + 1}`, value: 0, cumulative: 0 });
  }
  for (const u of users) {
    const t = new Date(u.created_at).getTime();
    for (const w of weeks) {
      if (t >= w.start && t <= w.end) w.value += 1;
      if (t <= w.end) w.cumulative += 1;
    }
  }

  // ── Geographic distribution (by country) ──
  const geoMap = new Map<string, number>();
  for (const u of users) { const c = (u.country_code || 'Unknown').toUpperCase(); geoMap.set(c, (geoMap.get(c) ?? 0) + 1); }
  const geo = Array.from(geoMap.entries()).map(([code, count]) => ({ code, count })).sort((a, b) => b.count - a.count);
  const geoMax = Math.max(1, ...geo.map((g) => g.count));

  // ── Retention cohorts (signup month × months active, via engagements) ──
  const { data: engData } = await A.from('engagements').select('customer_user_id, driver_id, created_at');
  const { data: dpData } = await A.from('driver_profiles').select('id, user_id');
  const driverUser: Record<string, string> = {};
  for (const d of (dpData ?? []) as { id: string; user_id: string | null }[]) { if (d.user_id) driverUser[d.id] = d.user_id; }
  const activeMonths: Record<string, Set<number>> = {};
  for (const e of engData ?? []) {
    const mk = monthKeyOf(new Date(e.created_at));
    const uids = [e.customer_user_id, e.driver_id ? driverUser[e.driver_id] : null].filter(Boolean) as string[];
    for (const uid of uids) (activeMonths[uid] ??= new Set()).add(mk);
  }
  const nowMk = monthKeyOf(now);
  const cohortMks = Array.from({ length: 6 }, (_, i) => nowMk - 5 + i);
  const cohortUsers: Record<number, string[]> = {};
  for (const u of users) { const mk = monthKeyOf(new Date(u.created_at)); if (mk >= cohortMks[0]!) (cohortUsers[mk] ??= []).push(u.id); }
  const cohorts = cohortMks.map((cmk) => {
    const size = (cohortUsers[cmk] ?? []).length;
    const cells: (number | null)[] = [];
    for (let k = 0; k + cmk <= nowMk; k++) {
      if (size === 0) { cells.push(null); continue; }
      const active = (cohortUsers[cmk] ?? []).filter((uid) => activeMonths[uid]?.has(cmk + k)).length;
      cells.push(Math.round((active / size) * 100));
    }
    return { label: monthLabelOf(cmk), size, cells };
  });
  const maxSpan = Math.max(1, ...cohorts.map((c) => c.cells.length));

  const alerts = await detectAnomalies(A);
  const totalUsers = users.filter((u) => !u.deleted_at).length;
  const last30 = users.filter((u) => new Date(u.created_at).getTime() >= now.getTime() - 30 * 86400000).length;

  // PWA installs (table is added by a migration — degrade gracefully if absent).
  const installs = { total: 0, ios: 0, android: 0, desktop: 0, other: 0, last30: 0 };
  let installsKnown = true;
  let recentInstalls: { name: string; platform: string; when: string }[] = [];
  try {
    const { data: rows, error } = await A.from('app_installs').select('user_id, platform, installed_at').not('installed_at', 'is', null);
    if (error) { installsKnown = false; }
    else {
      const list: { user_id: string | null; platform: string | null; installed_at: string }[] = rows ?? [];
      installs.total = list.length;
      for (const r of list) {
        const p = r.platform ?? 'other';
        if (p === 'ios') installs.ios++;
        else if (p === 'android') installs.android++;
        else if (p === 'desktop') installs.desktop++;
        else installs.other++;
        if (new Date(r.installed_at).getTime() >= now.getTime() - 30 * 86400000) installs.last30++;
      }
      const withUser = list.filter((r) => r.user_id).sort((a, b) => b.installed_at.localeCompare(a.installed_at)).slice(0, 8);
      const uids = Array.from(new Set(withUser.map((r) => r.user_id))) as string[];
      let names: Record<string, string> = {};
      if (uids.length) {
        const { data: us } = await A.from('users').select('id, full_name, email').in('id', uids);
        names = Object.fromEntries((us ?? []).map((u: { id: string; full_name: string | null; email: string | null }) => [u.id, u.full_name || u.email || 'User']));
      }
      recentInstalls = withUser.map((r) => ({ name: names[r.user_id as string] ?? 'User', platform: r.platform ?? '—', when: r.installed_at }));
    }
  } catch { installsKnown = false; }

  return (
    <>
      <AdminPageHeader backHref="/admin" backLabel="Admin" title="Analytics" subtitle="Growth, retention, geography, and anomaly alerts" />

      {/* Alerts */}
      <div className="mb-8">
        <AdminSectionLabel>Alerts</AdminSectionLabel>
        {alerts.length === 0 ? (
          <div className="mt-2 rounded-2xl border border-admin-green/30 bg-admin-green-soft px-5 py-4 font-body text-sm text-admin-green-text shadow-admin-sm">All clear — no anomalies detected.</div>
        ) : (
          <div className="mt-2 space-y-2">
            {alerts.map((a, i) => (
              <div key={i} className={'flex items-start gap-3 rounded-2xl border px-5 py-3.5 font-body shadow-admin-sm ' + (ALERT_STYLE[a.severity] ?? ALERT_STYLE.info)}>
                <span className="mt-0.5 shrink-0 rounded-full bg-white/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">{a.severity}</span>
                <div><div className="text-sm font-semibold">{a.title}</div><div className="text-[13px] opacity-90">{a.detail}</div></div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MiniStat label="Total users" value={totalUsers} />
        <MiniStat label="New (30 days)" value={last30} />
        <MiniStat label="Open alerts" value={alerts.filter((a) => a.severity !== 'info').length} />
      </div>

      {/* Growth */}
      <div className="mb-8 rounded-2xl border border-admin-border bg-admin-card p-6 shadow-admin-sm">
        <AdminSectionLabel>User growth · last 12 weeks</AdminSectionLabel>
        <div className="mt-3"><GrowthChart data={weeks.map((w) => ({ label: w.label, value: w.value, cumulative: w.cumulative }))} /></div>
      </div>

      {/* App installs */}
      <div className="mb-8">
        <AdminSectionLabel>App installs (PWA)</AdminSectionLabel>
        {!installsKnown ? (
          <div className="mt-2 rounded-2xl border border-admin-amber-soft bg-admin-amber-soft/40 px-6 py-5 font-body text-sm text-admin-amber-text shadow-admin-sm">
            Install tracking is ready but the <code>app_installs</code> table isn&apos;t in the database yet — apply migration <b>20260831000000_app_installs.sql</b> (<code>npm run db:push</code> or the SQL editor), then reload.
          </div>
        ) : (
          <>
            <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-5">
              <MiniStat label="Total installs" value={installs.total} />
              <MiniStat label="New (30 days)" value={installs.last30} />
              <MiniStat label="iPhone" value={installs.ios} />
              <MiniStat label="Android" value={installs.android} />
              <MiniStat label="Desktop" value={installs.desktop} />
            </div>
            {recentInstalls.length > 0 && (
              <div className="mt-3 overflow-hidden rounded-2xl border border-admin-border bg-admin-card shadow-admin-sm">
                <div className="border-b border-admin-border bg-admin-bg px-5 py-2.5 font-body text-[11px] uppercase tracking-wide text-admin-text-muted">Recent installers</div>
                {recentInstalls.map((r, i) => (
                  <div key={i} className="flex items-center justify-between border-b border-admin-border px-5 py-3 last:border-0">
                    <span className="font-body text-sm text-admin-text">{r.name}</span>
                    <span className="font-body text-[12px] capitalize text-admin-text-muted">{r.platform} · {new Date(r.when).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}</span>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-3 font-body text-[12px] text-admin-text-muted">Counts devices running the installed app (home-screen / standalone). Signed-in installers are named; anonymous ones are still counted.</p>
          </>
        )}
      </div>

      {/* Retention */}
      <div className="mb-8">
        <AdminSectionLabel>Retention cohorts</AdminSectionLabel>
        <p className="mb-3 mt-1 font-body text-[13px] text-admin-text-muted">% of each signup cohort with a booking in each subsequent month.</p>
        <div className="overflow-x-auto rounded-2xl border border-admin-border shadow-admin-sm">
          <table className="w-full bg-admin-card">
            <thead className="border-b border-admin-border bg-admin-bg">
              <tr>
                <th className="px-4 py-3 text-left font-body text-[11px] uppercase tracking-wide text-admin-text-muted">Cohort</th>
                <th className="px-4 py-3 text-right font-body text-[11px] uppercase tracking-wide text-admin-text-muted">Users</th>
                {Array.from({ length: maxSpan }, (_, k) => (
                  <th key={k} className="px-3 py-3 text-center font-body text-[11px] uppercase tracking-wide text-admin-text-muted">M{k}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cohorts.map((c) => (
                <tr key={c.label} className="border-b border-admin-border last:border-0">
                  <td className="px-4 py-3 font-body text-sm font-medium text-admin-text">{c.label}</td>
                  <td className="px-4 py-3 text-right font-body text-sm tabular-nums text-admin-text-muted">{c.size}</td>
                  {Array.from({ length: maxSpan }, (_, k) => {
                    const v = c.cells[k];
                    if (v == null) return <td key={k} className="px-3 py-3" />;
                    const bg = v === 0 ? 'transparent' : `rgb(var(--admin-green) / ${Math.max(0.08, v / 100).toFixed(2)})`;
                    return <td key={k} className="px-3 py-3 text-center font-body text-[12px] tabular-nums text-admin-text" style={{ background: bg }}>{v}%</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Geography */}
      <div className="mb-4">
        <AdminSectionLabel>Geographic distribution</AdminSectionLabel>
        <div className="mt-2 rounded-2xl border border-admin-border bg-admin-card p-6 shadow-admin-sm">
          {geo.length === 0 ? (
            <p className="font-body text-sm text-admin-text-muted">No users yet.</p>
          ) : (
            <div className="space-y-2.5">
              {geo.map((g) => (
                <div key={g.code} className="flex items-center gap-3">
                  <span className="w-16 font-body text-[13px] font-medium text-admin-text">{g.code}</span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-admin-bg">
                    <div className="h-full rounded-full bg-admin-green" style={{ width: `${(g.count / geoMax) * 100}%` }} />
                  </div>
                  <span className="w-10 text-right font-body text-[13px] tabular-nums text-admin-text-muted">{g.count}</span>
                </div>
              ))}
            </div>
          )}
          <p className="mt-4 font-body text-[12px] text-admin-text-muted">Grouped by country. City/state granularity needs a location field on profiles — say the word and I&apos;ll add it.</p>
        </div>
      </div>
    </>
  );
}
