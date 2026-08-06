import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { AdminPageHeader, AdminSectionLabel } from '@/components/avanti/admin/page-header';
import { RuleEditor, CardStatusButton } from './pricing-actions';

export const dynamic = 'force-dynamic';

const CARD_PILL: Record<string, string> = {
  draft: 'bg-admin-amber-soft text-admin-amber-text',
  published: 'bg-admin-green-soft text-admin-green-text',
  retired: 'bg-admin-bg text-admin-text-muted',
};

export default async function PricingAdminPage() {
  const user = await getAuthUser();
  if (!user) redirect('/sign-in');
  if (!user.roles.includes('admin_finance') && !user.roles.includes('super_admin')) redirect('/admin');

  const admin = createServiceRoleClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const A = admin as any;
  const { data: cardsData } = await A.from('rate_cards')
    .select('id, name, country_code, currency, version, status, effective_from')
    .order('country_code').order('version', { ascending: false });
  const cards = cardsData ?? [];
  const { data: rulesData } = await A.from('price_rules')
    .select('id, rate_card_id, engagement_type, min_verification_tier, vehicle_class, time_band, day_type, base_customer_price, base_driver_payout, overtime_multiplier, overtime_threshold_hours, minimum_charge')
    .order('vehicle_class');
  const rules = rulesData ?? [];
  const rulesByCard: Record<string, typeof rules> = {};
  for (const r of rules) (rulesByCard[r.rate_card_id] ??= []).push(r);

  return (
    <>
      <AdminPageHeader backHref="/admin" backLabel="Admin" title="Rate cards & pricing" subtitle="Edit the published rate card that powers on-demand quotes" />

      {cards.length === 0 ? (
        <div className="rounded-2xl border border-admin-border bg-admin-card px-6 py-12 text-center font-body text-sm text-admin-text-muted shadow-admin-sm">No rate cards yet.</div>
      ) : (
        <div className="space-y-8">
          {cards.map((c: { id: string; name: string; country_code: string; currency: string; version: number; status: string; effective_from: string | null }) => (
            <div key={c.id} className="overflow-hidden rounded-2xl border border-admin-border bg-admin-card shadow-admin-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-admin-border bg-admin-bg px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <span className="font-display text-[15px] font-semibold text-admin-text">{c.name}</span>
                  <span className="font-body text-[12px] text-admin-text-muted">{c.country_code} · {c.currency} · v{c.version}</span>
                  <span className={'inline-flex items-center rounded-full px-2 py-0.5 font-body text-[11px] font-medium uppercase tracking-wide ' + (CARD_PILL[c.status] ?? 'bg-admin-bg text-admin-text-muted')}>{c.status}</span>
                </div>
                <CardStatusButton cardId={c.id} status={c.status} />
              </div>

              <div className="px-5 py-2">
                {(rulesByCard[c.id] ?? []).length === 0 ? (
                  <p className="py-6 text-center font-body text-sm text-admin-text-muted">No price rules on this card.</p>
                ) : (
                  (rulesByCard[c.id] ?? []).map((r: typeof rules[number]) => (
                    <div key={r.id} className="border-b border-admin-border py-3.5 last:border-0">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="font-body text-[12px] font-semibold uppercase tracking-wide text-admin-text">{r.vehicle_class}</span>
                        <span className="font-body text-[11px] text-admin-text-muted">{r.engagement_type} · {String(r.min_verification_tier).toUpperCase()}+ · {r.time_band}/{r.day_type}</span>
                      </div>
                      <RuleEditor rule={r} />
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6">
        <AdminSectionLabel>Note</AdminSectionLabel>
        <p className="font-body text-[13px] leading-relaxed text-admin-text-muted">
          Editing a rule changes what new quotes charge immediately. Only the <b className="text-admin-text">published</b> card is used by the booking engine. VAT (7.5%) is added on top of these figures at quote time.
        </p>
      </div>
    </>
  );
}
