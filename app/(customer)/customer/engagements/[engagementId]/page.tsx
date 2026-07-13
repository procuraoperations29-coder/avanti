import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, MapPin, Info } from 'lucide-react';
import { getAuthUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { SectionLabel } from '@/components/avanti/section-label';
import { SpecRow } from '@/components/avanti/spec-row';
import { TierBadge, type TierLevel } from '@/components/avanti/tier-badge';
import { PaymentCallbackHandler } from './payment-callback-handler';

function formatNaira(n: number): string {
  return `₦${n.toLocaleString('en-NG')}`;
}

export default async function EngagementDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ engagementId: string }>;
  searchParams: Promise<{ reference?: string; mock?: string }>;
}) {
  const { engagementId } = await params;
  const sp = await searchParams;

  const user = await getAuthUser();
  if (!user) redirect('/sign-in');

  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: engagement } = await (supabase as any)
    .from('v_engagements_customer')
    .select('*')
    .eq('id', engagementId)
    .eq('customer_user_id', user.id)
    .single();

  if (!engagement) notFound();

  const startDate = new Date(engagement.starts_at);
  const endDate = engagement.ends_at ? new Date(engagement.ends_at) : null;

  return (
    <div className="mx-auto max-w-3xl px-4 pt-8 sm:px-6 pb-20">
      {/* If a payment reference is in the URL, run the verify on the client */}
      {sp.reference && (
        <PaymentCallbackHandler
          reference={sp.reference}
          engagementId={engagementId}
          initialStatus={engagement.status}
        />
      )}

      <Link
        href="/customer/engagements"
        className="mb-4 inline-flex items-center gap-1 font-mono text-xs uppercase tracking-wider text-ink-muted hover:text-ink"
      >
        <ChevronLeft className="h-3.5 w-3.5" /> All engagements
      </Link>

      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <SectionLabel>{engagement.status.replace(/_/g, ' ')}</SectionLabel>
          <h1 className="mt-2 font-display text-4xl leading-tight text-ink">
            {engagement.driver_name ?? 'Driver'}
          </h1>
          <p className="mt-2 font-body text-sm text-ink-muted capitalize">
            {engagement.engagement_type.replace(/_/g, ' ')}
          </p>
        </div>
        {engagement.driver_verification_tier && (
          <TierBadge tier={engagement.driver_verification_tier as TierLevel} />
        )}
      </div>

      {/* Status banners */}
      {engagement.status === 'draft' && (
        <div className="mb-6 border-l-2 border-brass bg-brass-soft px-4 py-3">
          <p className="font-body text-sm text-ink">
            <span className="font-mono text-xs uppercase tracking-wider">Payment pending</span> —
            complete the payment to confirm this booking.
          </p>
        </div>
      )}
      {engagement.status === 'confirmed' && (
        <div className="mb-6 border-l-2 border-green bg-green-soft px-4 py-3">
          <p className="font-body text-sm text-ink">
            <span className="font-mono text-xs uppercase tracking-wider">Confirmed</span> —
            your driver will be there at the start time.
          </p>
        </div>
      )}
      {engagement.status === 'cancelled' && (
        <div className="mb-6 border-l-2 border-oxblood bg-paper-2 px-4 py-3">
          <p className="font-body text-sm text-ink">
            <span className="font-mono text-xs uppercase tracking-wider">Cancelled</span> — this
            engagement was cancelled.
          </p>
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

      {/* Instructions */}
      {engagement.special_instructions && (
        <div className="mb-6 border border-line bg-paper-2 p-5">
          <SectionLabel>Instructions</SectionLabel>
          <div className="mt-3 flex items-start gap-2 font-body text-sm text-ink">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted" strokeWidth={1.5} />
            <span>{engagement.special_instructions}</span>
          </div>
        </div>
      )}

      {/* Cost — customer side only, no payout / commission per Phase 3 D26 */}
      <div className="border border-line bg-paper-2 p-5">
        <SectionLabel>Price</SectionLabel>
        <div className="mt-3 font-display text-3xl leading-none text-ink">
          {engagement.currency === 'NGN'
            ? formatNaira(engagement.customer_price_total ?? 0)
            : `${engagement.currency} ${engagement.customer_price_total ?? 0}`}
        </div>
        <div className="mt-2 font-mono text-[10px] uppercase tracking-wider text-ink-muted">
          Total · {engagement.currency}
        </div>
      </div>
    </div>
  );
}
