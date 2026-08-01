import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

/**
 * EngagementCard — one row in the customer's engagements list.
 *
 * Shows the driver name, engagement type, start time, price,
 * status. Info-isolation compliant: only what the customer should see.
 */

export interface EngagementCardProps {
  engagementId: string;
  driverName: string;
  engagementType: string;
  status: string;
  startsAt: string;
  currency: string;
  customerPriceTotal: number;
}

function formatNaira(n: number): string {
  return `₦${n.toLocaleString('en-NG')}`;
}

const STATUS_STYLE: Record<string, string> = {
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

export function EngagementCard({
  engagementId,
  driverName,
  engagementType,
  status,
  startsAt,
  currency,
  customerPriceTotal,
}: EngagementCardProps) {
  const startDate = new Date(startsAt);
  return (
    <Link
      href={`/customer/engagements/${engagementId}`}
      className="group flex items-center justify-between gap-4 border-b border-admin-border px-4 py-4 transition-colors last:border-0 hover:bg-admin-bg"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className="truncate font-body text-sm font-medium text-admin-text">{driverName}</div>
          <span
            className={cn(
              'inline-flex shrink-0 items-center rounded-full px-2 py-0.5 font-body text-[11px] font-medium uppercase tracking-wide',
              STATUS_STYLE[status] ?? 'bg-admin-bg text-admin-text-muted'
            )}
          >
            {status.replace(/_/g, ' ')}
          </span>
        </div>
        <div className="mt-1.5 flex items-baseline justify-between gap-2 font-body text-xs text-admin-text-muted">
          <span className="truncate capitalize">
            {engagementType.replace(/_/g, ' ')} ·{' '}
            {startDate.toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}{' '}
            · {startDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
          </span>
          <span className="shrink-0 font-medium tabular-nums text-admin-text">
            {currency === 'NGN' ? formatNaira(customerPriceTotal) : `${currency} ${customerPriceTotal}`}
          </span>
        </div>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-admin-text-muted transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
