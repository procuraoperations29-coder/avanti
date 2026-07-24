import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, MapPin, Info, Phone } from 'lucide-react';
import { getAuthUser } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { SectionLabel } from '@/components/avanti/section-label';
import { SpecRow } from '@/components/avanti/spec-row';
import { DriverEngagementActions } from '@/components/driver/engagement-actions';
import { statusLabel, type EngagementStatus } from '@/lib/engagement/driver-transitions';

function formatNaira(n: number): string {
  return `₦${n.toLocaleString('en-NG')}`;
}

export default async function DriverEngagementDetailPage({
  params,
}: {
  params: Promise<{ engagementId: string }>;
}) {
  const { engagementId } = await params;

  const user = await getAuthUser();
  if (!user) redirect('/sign-in');
  if (!user.roles.includes('driver')) redirect('/sign-in');

  const admin = createServiceRoleClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (admin as any)
    .from('driver_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();
  if (!profile) redirect('/driver/onboarding/step-pending');

  // Fetch engagement (guarded by driver_id)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: engagement } = await (admin as any)
    .from('engagements')
    .select(
      'id, engagement_type, status, starts_at, ends_at, expected_daily_hours, timezone, pickup_address, special_instructions, driver_payout_total, currency, activated_at, completed_at, requested_at, confirmed_at, customer_user_id'
    )
    .eq('id', engagementId)
    .eq('driver_id', profile.id)
    .single();

  if (!engagement) notFound();

  // Customer details for pickup identification
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: customer } = await (admin as any)
    .from('users')
    .select('full_name, phone')
    .eq('id', engagement.customer_user_id)
    .single();

  const startDate = new Date(engagement.starts_at);
  const endDate = engagement.ends_at ? new Date(engagement.ends_at) : null;

  return (
    <div className="mx-auto max-w-3xl px-4 pt-8 sm:px-6 pb-20">
      <Link
        href="/driver/engagements"
        className="mb-4 inline-flex items-center gap-1 font-mono text-xs uppercase tracking-wider text-ink-muted hover:text-ink"
      >
        <ChevronLeft className="h-3.5 w-3.5" /> All engagements
      </Link>

      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <SectionLabel>{statusLabel(engagement.status as EngagementStatus)}</SectionLabel>
          <h1 className="mt-2 font-display text-4xl leading-tight text-ink">
            {customer?.full_name ?? 'Customer'}
          </h1>
          <p className="mt-2 font-body text-sm text-ink-muted capitalize">
            {engagement.engagement_type.replace(/_/g, ' ')}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="mb-8">
        <DriverEngagementActions
          engagementId={engagementId}
          currentStatus={engagement.status as EngagementStatus}
        />
      </div>

      {/* Contact */}
      {customer?.phone && (
        <div className="mb-6 border border-line bg-paper-2 p-5">
          <SectionLabel>Customer contact</SectionLabel>
          <a
            href={`tel:${customer.phone}`}
            className="mt-3 flex items-center gap-2 font-body text-sm text-ink hover:text-ink-2"
          >
            <Phone className="h-4 w-4 text-ink-muted" strokeWidth={1.5} />
            <span className="font-mono">+{customer.phone}</span>
          </a>
        </div>
      )}

      {/* Timing */}
      <div className="mb-6 border border-line bg-paper-2 p-5">
        <SectionLabel>When</SectionLabel>
        <dl className="mt-3">
          <SpecRow
            label="Start"
            value={`${startDate.toLocaleDateString('en-GB', {
              weekday: 'short',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })} · ${startDate.toLocaleTimeString('en-GB', {
              hour: '2-digit',
              minute: '2-digit',
            })}`}
            variant="mono"
          />
          {endDate && (
            <SpecRow
              label="End"
              value={`${endDate.toLocaleDateString('en-GB', {
                weekday: 'short',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })} · ${endDate.toLocaleTimeString('en-GB', {
                hour: '2-digit',
                minute: '2-digit',
              })}`}
              variant="mono"
            />
          )}
          <SpecRow label="Timezone" value={engagement.timezone ?? 'Africa/Lagos'} variant="mono" />
          {engagement.activated_at && (
            <SpecRow
              label="En route since"
              value={new Date(engagement.activated_at).toLocaleTimeString('en-GB', {
                hour: '2-digit',
                minute: '2-digit',
              })}
              variant="mono"
            />
          )}
          {engagement.completed_at && (
            <SpecRow
              label="Completed at"
              value={new Date(engagement.completed_at).toLocaleTimeString('en-GB', {
                hour: '2-digit',
                minute: '2-digit',
              })}
              variant="mono"
            />
          )}
        </dl>
      </div>

      {/* Pickup */}
      {engagement.pickup_address && (
        <div className="mb-6 border border-line bg-paper-2 p-5">
          <SectionLabel>Pickup</SectionLabel>
          <div className="mt-3 flex items-start gap-2 font-body text-sm text-ink">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted" strokeWidth={1.5} />
            <span>{engagement.pickup_address.line}</span>
          </div>
        </div>
      )}

      {/* Special instructions */}
      {engagement.special_instructions && (
        <div className="mb-6 border border-line bg-paper-2 p-5">
          <SectionLabel>Instructions from customer</SectionLabel>
          <div className="mt-3 flex items-start gap-2 font-body text-sm text-ink">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted" strokeWidth={1.5} />
            <span>{engagement.special_instructions}</span>
          </div>
        </div>
      )}

      {/* Payout — DRIVER SIDE ONLY */}
      <div className="border border-line bg-paper-2 p-5">
        <SectionLabel>Your payout</SectionLabel>
        <div className="mt-3 font-display text-3xl leading-none text-ink">
          {engagement.currency === 'NGN'
            ? formatNaira(engagement.driver_payout_total ?? 0)
            : `${engagement.currency} ${engagement.driver_payout_total ?? 0}`}
        </div>
        <div className="mt-2 font-mono text-[10px] uppercase tracking-wider text-ink-muted">
          Gross, before withholding tax. Paid on next payout batch after completion.
        </div>
      </div>
    </div>
  );
}
