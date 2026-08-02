import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, MapPin, Info } from 'lucide-react';
import { getAuthUser } from '@/lib/auth';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { AdminSectionLabel, AdminSpecRow } from '@/components/avanti/admin/page-header';
import { TierBadge, type TierLevel } from '@/components/avanti/tier-badge';
import { cn } from '@/lib/utils/cn';
import { PaymentCallbackHandler } from './payment-callback-handler';
import { ConfirmCompletionButton } from './confirm-completion-button';

function formatNaira(n: number): string {
  return `₦${n.toLocaleString('en-NG')}`;
}

const STATUS_PILL: Record<string, string> = {
  draft: 'bg-admin-bg text-admin-text-muted',
  pending_confirmation: 'bg-admin-amber-soft text-admin-amber-text',
  confirmed: 'bg-admin-green-soft text-admin-green-text',
  activated: 'bg-admin-green-soft text-admin-green-text',
  in_progress: 'bg-admin-green-soft text-admin-green-text',
  completed: 'bg-admin-bg text-admin-text-muted',
  cancelled: 'bg-red-500/12 text-red-600',
  expired: 'bg-admin-bg text-admin-text-muted',
  refunded: 'bg-admin-bg text-admin-text-muted',
};

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

  // customer_confirmed_at isn't on the customer view — read it directly.
  const admin = createServiceRoleClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: engRow } = await (admin as any)
    .from('engagements')
    .select('customer_confirmed_at')
    .eq('id', engagementId)
    .single();
  const customerConfirmedAt: string | null = engRow?.customer_confirmed_at ?? null;

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
        className="mb-4 inline-flex items-center gap-1 font-body text-[13px] text-admin-text-muted transition-colors hover:text-admin-text"
      >
        <ChevronLeft className="h-3.5 w-3.5" /> All engagements
      </Link>

      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <span
            className={cn(
              'inline-flex items-center rounded-full px-2 py-0.5 font-body text-[11px] font-medium uppercase tracking-wide',
              STATUS_PILL[engagement.status] ?? 'bg-admin-bg text-admin-text-muted'
            )}
          >
            {engagement.status.replace(/_/g, ' ')}
          </span>
          <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-admin-text">
            {engagement.driver_name ?? 'Driver'}
          </h1>
          <p className="mt-1 font-body text-[13px] text-admin-text-muted capitalize">
            {engagement.engagement_type.replace(/_/g, ' ')}
          </p>
        </div>
        {engagement.driver_verification_tier && (
          <TierBadge tier={engagement.driver_verification_tier as TierLevel} />
        )}
      </div>

      {/* Status banners */}
      {engagement.status === 'draft' && (
        <div className="mb-6 rounded-2xl border-l-2 border-admin-amber bg-admin-amber-soft px-4 py-3 shadow-admin-sm">
          <p className="font-body text-sm text-admin-text">
            <span className="font-body text-[11px] font-medium uppercase tracking-wide text-admin-amber-text">
              Payment pending
            </span>{' '}
            — complete the payment to confirm this booking.
          </p>
        </div>
      )}
      {engagement.status === 'confirmed' && (
        <div className="mb-6 rounded-2xl border-l-2 border-admin-green bg-admin-green-soft px-4 py-3 shadow-admin-sm">
          <p className="font-body text-sm text-admin-text">
            <span className="font-body text-[11px] font-medium uppercase tracking-wide text-admin-green-text">
              Confirmed
            </span>{' '}
            — your driver will be there at the start time.
          </p>
        </div>
      )}
      {engagement.status === 'cancelled' && (
        <div className="mb-6 rounded-2xl border-l-2 border-red-500/40 bg-red-500/10 px-4 py-3 shadow-admin-sm">
          <p className="font-body text-sm text-admin-text">
            <span className="font-body text-[11px] font-medium uppercase tracking-wide text-red-600">
              Cancelled
            </span>{' '}
            — this engagement was cancelled.
          </p>
        </div>
      )}
      {engagement.status === 'active' && (
        <div className="mb-6 rounded-2xl border-l-2 border-admin-green bg-admin-green-soft px-4 py-3 shadow-admin-sm">
          <p className="font-body text-sm text-admin-text">
            <span className="font-body text-[11px] font-medium uppercase tracking-wide text-admin-green-text">
              In progress
            </span>{' '}
            — {engagement.driver_name ?? 'your driver'} is on the job.
          </p>
        </div>
      )}
      {engagement.status === 'completed' && (
        <div className="mb-6 rounded-2xl border border-admin-border bg-admin-card px-5 py-4 shadow-admin-sm">
          {customerConfirmedAt ? (
            <p className="font-body text-sm text-admin-text">
              <span className="font-body text-[11px] font-medium uppercase tracking-wide text-admin-green-text">
                Completed & confirmed
              </span>{' '}
              — thanks for confirming. We hope it went well.
            </p>
          ) : (
            <>
              <p className="font-body text-sm text-admin-text">
                <span className="font-body text-[11px] font-medium uppercase tracking-wide text-admin-text-muted">
                  Marked complete
                </span>{' '}
                — {engagement.driver_name ?? 'your driver'} marked this engagement done. Please
                confirm on your end so we know everything went well.
              </p>
              <ConfirmCompletionButton engagementId={engagementId} />
            </>
          )}
        </div>
      )}

      {/* Timing */}
      <div className="mb-6 rounded-2xl border border-admin-border bg-admin-card p-5 shadow-admin-sm">
        <AdminSectionLabel>When</AdminSectionLabel>
        <dl className="mt-3">
          <AdminSpecRow
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
            <AdminSpecRow
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
          <AdminSpecRow label="Timezone" value={engagement.timezone ?? 'Africa/Lagos'} variant="mono" />
        </dl>
      </div>

      {/* Pickup */}
      {engagement.pickup_address && (
        <div className="mb-6 rounded-2xl border border-admin-border bg-admin-card p-5 shadow-admin-sm">
          <AdminSectionLabel>Pickup</AdminSectionLabel>
          <div className="mt-3 flex items-start gap-2 font-body text-sm text-admin-text">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-admin-text-muted" strokeWidth={1.5} />
            <span>{engagement.pickup_address.line}</span>
          </div>
        </div>
      )}

      {/* Instructions */}
      {engagement.special_instructions && (
        <div className="mb-6 rounded-2xl border border-admin-border bg-admin-card p-5 shadow-admin-sm">
          <AdminSectionLabel>Instructions</AdminSectionLabel>
          <div className="mt-3 flex items-start gap-2 font-body text-sm text-admin-text">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-admin-text-muted" strokeWidth={1.5} />
            <span>{engagement.special_instructions}</span>
          </div>
        </div>
      )}

      {/* Cost — customer side only, no payout / commission per Phase 3 D26 */}
      <div className="rounded-2xl border border-admin-border bg-admin-card p-5 shadow-admin">
        <AdminSectionLabel>Price</AdminSectionLabel>
        <div className="mt-1 font-display text-3xl font-semibold leading-none tabular-nums tracking-tight text-admin-text">
          {engagement.currency === 'NGN'
            ? formatNaira(engagement.customer_price_total ?? 0)
            : `${engagement.currency} ${engagement.customer_price_total ?? 0}`}
        </div>
        <div className="mt-2 font-body text-[11px] font-medium uppercase tracking-wide text-admin-text-muted">
          Total · {engagement.currency}
        </div>
      </div>
    </div>
  );
}
