import { redirect } from 'next/navigation';
import Link from 'next/link';
import { CarFront } from 'lucide-react';
import { getAuthUser } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { AdminPageHeader, AdminSectionLabel } from '@/components/avanti/admin/page-header';
import { getPricingSettings, tierSalary, placementFeeInclVat, driverTakeHome } from '@/lib/pricing/settings';
import { formatNaira } from '@/lib/permanent/salary';
import { CardStatusButton } from './pricing-actions';
import { SettingsEditor } from './settings-editor';
import { CardRules, type Rule } from './ondemand-rates';

export const dynamic = 'force-dynamic';

const CARD_PILL: Record<string, string> = {
  draft: 'bg-admin-amber-soft text-admin-amber-text',
  published: 'bg-admin-green-soft text-admin-green-text',
  retired: 'bg-admin-bg text-admin-text-muted',
};
const TIERS = ['t1', 't2', 't3', 't4'];

export default async function PricingAdminPage() {
  const user = await getAuthUser();
  if (!user) redirect('/sign-in');
  if (!user.roles.includes('admin_finance') && !user.roles.includes('super_admin')) redirect('/admin');

  const admin = createServiceRoleClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const A = admin as any;
  const settings = await getPricingSettings();

  const { data: cardsData } = await A.from('rate_cards')
    .select('id, name, country_code, currency, version, status, effective_from')
    .order('country_code').order('version', { ascending: false });
  const cards = cardsData ?? [];
  const { data: rulesData } = await A.from('price_rules')
    .select('id, rate_card_id, engagement_type, min_verification_tier, vehicle_class, time_band, day_type, base_customer_price, base_driver_payout, overtime_multiplier, overtime_threshold_hours, minimum_charge');
  const rules = (rulesData ?? []) as (Rule & { rate_card_id: string })[];
  const rulesByCard: Record<string, Rule[]> = {};
  for (const r of rules) (rulesByCard[r.rate_card_id] ??= []).push(r);

  return (
    <>
      <AdminPageHeader backHref="/admin" backLabel="Admin" title="Pricing" subtitle="Set what customers pay, what drivers earn, your commission, and tax — per product" />

      {/* ── Global settings ── */}
      <div className="mb-8">
        <AdminSectionLabel>Global — tax, commission &amp; tier salaries</AdminSectionLabel>
        <p className="mb-3 mt-1 font-body text-[13px] text-admin-text-muted">These apply across products. Changing tax or a rate affects new quotes and invoices immediately; permanent salary changes apply to new placements.</p>
        <SettingsEditor initial={settings} />
      </div>

      {/* ── On-demand ── */}
      <div className="mb-8">
        <AdminSectionLabel>On-demand — driver by the hour or day</AdminSectionLabel>
        <p className="mb-3 mt-1 font-body text-[13px] text-admin-text-muted">Set the customer price per driver tier &amp; vehicle class; the driver&apos;s share comes from the tier commission. Only the <b className="text-admin-text">published</b> card powers live quotes. VAT ({Math.round(settings.vatRate * 1000) / 10}%) is added on top.</p>
        {cards.length === 0 ? (
          <div className="rounded-2xl border border-admin-border bg-admin-card px-6 py-8 text-center font-body text-sm text-admin-text-muted shadow-admin-sm">No rate cards yet.</div>
        ) : (
          <div className="space-y-4">
            {cards.map((c: { id: string; name: string; country_code: string; currency: string; version: number; status: string }) => (
              <div key={c.id} className="overflow-hidden rounded-2xl border border-admin-border bg-admin-card shadow-admin-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-admin-border bg-admin-bg px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <span className="font-display text-[15px] font-semibold text-admin-text">{c.name}</span>
                    <span className="font-body text-[12px] text-admin-text-muted">{c.country_code} · {c.currency} · v{c.version}</span>
                    <span className={'inline-flex items-center rounded-full px-2 py-0.5 font-body text-[11px] font-medium uppercase tracking-wide ' + (CARD_PILL[c.status] ?? 'bg-admin-bg text-admin-text-muted')}>{c.status}</span>
                  </div>
                  <CardStatusButton cardId={c.id} status={c.status} />
                </div>
                <CardRules cardId={c.id} rules={rulesByCard[c.id] ?? []} commissionByTier={settings.ondemandCommissionByTier} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Permanent placement ── */}
      <div className="mb-8">
        <AdminSectionLabel>Permanent placement — monthly salary by tier</AdminSectionLabel>
        <p className="mb-3 mt-1 font-body text-[13px] text-admin-text-muted">Edit the salaries above. Placement fee = {Math.round(settings.placementFeeRate * 100)}% of a month + VAT; you keep {Math.round(settings.placementCommissionRate * 1000) / 10}% commission.</p>
        <div className="overflow-hidden rounded-2xl border border-admin-border bg-admin-card shadow-admin-sm">
          <div className="grid grid-cols-4 gap-2 bg-admin-bg px-5 py-2 font-body text-[10px] uppercase tracking-wide text-admin-text-muted">
            <span>Tier</span><span>Monthly salary</span><span>One-off fee</span><span>Driver take-home</span>
          </div>
          {TIERS.map((t) => {
            const salary = tierSalary(settings, t);
            return (
              <div key={t} className="grid grid-cols-4 gap-2 border-t border-admin-border px-5 py-2.5 font-body text-[13px] tabular-nums text-admin-text">
                <span className="font-semibold uppercase">{t}</span>
                <span>{formatNaira(salary)}</span>
                <span className="text-admin-text-muted">{formatNaira(placementFeeInclVat(salary, settings))}</span>
                <span className="text-admin-text-muted">{formatNaira(driverTakeHome(salary, settings))}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Car hire ── */}
      <div className="mb-8">
        <AdminSectionLabel>Car hire — priced per vehicle</AdminSectionLabel>
        <Link href="/admin/car-hire/vehicles" className="flex items-center gap-3 rounded-2xl border border-admin-border bg-admin-card p-4 shadow-admin-sm transition-colors hover:border-admin-green/40">
          <CarFront className="h-5 w-5 text-admin-green-text" strokeWidth={1.75} />
          <div>
            <div className="font-body text-sm font-semibold text-admin-text">Manage hire vehicle pricing</div>
            <div className="font-body text-[12px] text-admin-text-muted">Each car carries its own daily rate, partner cost, and driver pay — set them per vehicle, with a live margin preview.</div>
          </div>
        </Link>
      </div>

      {/* ── Manual products ── */}
      <div className="rounded-2xl border border-admin-border bg-admin-bg/50 px-5 py-4">
        <AdminSectionLabel>Corporate &amp; out-of-state</AdminSectionLabel>
        <p className="mt-1 font-body text-[13px] text-admin-text-muted">These are quoted by hand per job (corporate staffing rates per assignment; out-of-state trips per request). They use the global VAT ({Math.round(settings.vatRate * 1000) / 10}%) and corporate upfront ({Math.round(settings.corporateUpfrontRate * 100)}%) set above.</p>
      </div>
    </>
  );
}
