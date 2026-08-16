import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Megaphone, BarChart3, Users } from 'lucide-react';
import { getAuthUser } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { AdminPageHeader, MiniStat } from '@/components/avanti/admin/page-header';

export const dynamic = 'force-dynamic';

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function topN(rows: Array<Record<string, unknown>>, field: string, n = 8): { label: string; count: number }[] {
  const m = new Map<string, number>();
  for (const r of rows) {
    const v = r[field];
    if (v == null || v === '') continue;
    const key = String(v);
    m.set(key, (m.get(key) ?? 0) + 1);
  }
  return Array.from(m.entries()).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count).slice(0, n);
}

function BarList({ title, items, empty }: { title: string; items: { label: string; count: number }[]; empty: string }) {
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <div className="rounded-2xl border border-admin-border bg-admin-card p-5 shadow-admin-sm">
      <div className="mb-3 font-body text-[11px] font-semibold uppercase tracking-wide text-admin-text-muted">{title}</div>
      {items.length === 0 ? (
        <p className="py-4 text-center font-body text-sm text-admin-text-muted">{empty}</p>
      ) : (
        <div className="space-y-2">
          {items.map((i) => (
            <div key={i.label} className="flex items-center gap-3">
              <span className="w-40 truncate font-body text-[12px] text-admin-text" title={i.label}>{i.label}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-admin-bg">
                <div className="h-full rounded-full bg-admin-green" style={{ width: `${(i.count / max) * 100}%` }} />
              </div>
              <span className="w-10 text-right font-body text-[13px] tabular-nums text-admin-text-muted">{i.count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default async function MarketingPage() {
  const user = await getAuthUser();
  if (!user) redirect('/sign-in');
  const canView = user.roles.includes('admin_support') || user.roles.includes('admin_finance') || user.roles.includes('super_admin');
  if (!canView) redirect('/admin');

  const admin = createServiceRoleClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const A = admin as any;

  const since = new Date(Date.now() - 30 * 86_400_000);
  const { data: pvData } = await A.from('page_views')
    .select('path, referrer_host, utm_source, utm_campaign, visitor_id, is_signed_in, created_at')
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: false })
    .limit(20000);
  const views = (pvData ?? []) as Array<Record<string, unknown>>;

  const totalViews = views.length;
  const uniqueVisitors = new Set(views.map((v) => v.visitor_id).filter(Boolean)).size;
  const signedInViews = views.filter((v) => v.is_signed_in).length;

  // Daily views, last 14 days.
  const days: { key: string; label: string; count: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000);
    days.push({ key: dayKey(d), label: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }), count: 0 });
  }
  const dayIndex: Record<string, number> = Object.fromEntries(days.map((d, i) => [d.key, i]));
  for (const v of views) {
    const k = String(v.created_at).slice(0, 10);
    const idx = dayIndex[k];
    if (idx !== undefined) {
      const d = days[idx];
      if (d) d.count += 1;
    }
  }
  const dayMax = Math.max(1, ...days.map((d) => d.count));

  const topPages = topN(views, 'path');
  const topReferrers = topN(views, 'referrer_host');
  const topSources = topN(views, 'utm_source');
  const topCampaigns = topN(views, 'utm_campaign');

  // New signups (30d), excluding staff.
  const { data: staffRows } = await A.from('user_roles').select('user_id').in('role', ['admin_verifier', 'admin_support', 'admin_finance', 'admin_compliance', 'super_admin']).is('revoked_at', null);
  const staff = new Set((staffRows ?? []).map((r: { user_id: string }) => r.user_id));
  const { data: newUsers } = await A.from('users').select('id, created_at').gte('created_at', since.toISOString());
  const signups = (newUsers ?? []).filter((u: { id: string }) => !staff.has(u.id)).length;

  return (
    <>
      <AdminPageHeader backHref="/admin" backLabel="Admin" title="Marketing" subtitle="Traffic, sources, and campaign performance — last 30 days" />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MiniStat label="Page views" value={totalViews} />
        <MiniStat label="Unique visitors" value={uniqueVisitors} />
        <MiniStat label="New sign-ups" value={signups} />
        <MiniStat label="Signed-in views" value={signedInViews} />
      </div>

      {/* Daily views */}
      <div className="mb-6 rounded-2xl border border-admin-border bg-admin-card p-5 shadow-admin-sm">
        <div className="mb-4 font-body text-[11px] font-semibold uppercase tracking-wide text-admin-text-muted">Page views · last 14 days</div>
        <div className="flex items-end gap-1.5" style={{ height: 140 }}>
          {days.map((d) => (
            <div key={d.key} className="flex flex-1 flex-col items-center justify-end gap-1">
              <div className="w-full rounded-t bg-admin-green/80" style={{ height: `${(d.count / dayMax) * 110}px` }} title={`${d.count} views`} />
              <span className="font-body text-[9px] text-admin-text-muted">{d.label.split(' ')[0]}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <BarList title="Top pages" items={topPages} empty="No page views yet." />
        <BarList title="Top referrers" items={topReferrers} empty="No external referrers yet." />
        <BarList title="Traffic sources (utm_source)" items={topSources} empty="Tag campaign links with ?utm_source=… to see this." />
        <BarList title="Campaigns (utm_campaign)" items={topCampaigns} empty="Tag links with ?utm_campaign=… to see this." />
      </div>

      {/* Marketing activities */}
      <div className="mt-8">
        <div className="mb-3 font-body text-sm font-semibold text-admin-text">Marketing activities</div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Link href="/admin/notifications" className="flex items-center gap-3 rounded-2xl border border-admin-border bg-admin-card p-4 shadow-admin-sm transition-colors hover:border-admin-green/40">
            <Megaphone className="h-5 w-5 text-admin-green-text" strokeWidth={1.75} />
            <div>
              <div className="font-body text-sm font-semibold text-admin-text">Send a broadcast</div>
              <div className="font-body text-[12px] text-admin-text-muted">Push a message to users</div>
            </div>
          </Link>
          <Link href="/admin/analytics" className="flex items-center gap-3 rounded-2xl border border-admin-border bg-admin-card p-4 shadow-admin-sm transition-colors hover:border-admin-green/40">
            <Users className="h-5 w-5 text-admin-green-text" strokeWidth={1.75} />
            <div>
              <div className="font-body text-sm font-semibold text-admin-text">Audience</div>
              <div className="font-body text-[12px] text-admin-text-muted">Users, geography, installs</div>
            </div>
          </Link>
          <div className="flex items-center gap-3 rounded-2xl border border-admin-border bg-admin-bg/60 p-4">
            <BarChart3 className="h-5 w-5 text-admin-text-muted" strokeWidth={1.75} />
            <div>
              <div className="font-body text-sm font-semibold text-admin-text">Track a campaign</div>
              <div className="font-body text-[12px] text-admin-text-muted">Add ?utm_source=…&utm_campaign=… to shared links</div>
            </div>
          </div>
        </div>
      </div>

      <p className="mt-6 font-body text-[12px] text-admin-text-muted">
        First-party, privacy-preserving analytics — anonymous visitor id, path, referrer, and UTM tags only. Admin browsing isn&apos;t counted.
      </p>
    </>
  );
}
