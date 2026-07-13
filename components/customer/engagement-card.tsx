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
  draft: 'text-ink-muted',
  pending_confirmation: 'text-brass',
  confirmed: 'text-green',
  activated: 'text-green',
  in_progress: 'text-green',
  completed: 'text-ink-muted',
  cancelled: 'text-oxblood',
  expired: 'text-ink-muted',
  refunded: 'text-ink-muted',
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
      className="group flex items-center justify-between gap-4 border-b border-line px-4 py-4 transition-colors hover:bg-paper-3"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <div className="truncate font-body text-sm text-ink">{driverName}</div>
          <div className={cn('font-mono text-[10px] uppercase tracking-wider', STATUS_STYLE[status] ?? 'text-ink-muted')}>
            {status.replace(/_/g, ' ')}
          </div>
        </div>
        <div className="mt-1 flex items-baseline justify-between gap-2 font-mono text-xs text-ink-muted">
          <span>
            {engagementType.replace(/_/g, ' ')} ·{' '}
            {startDate.toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}{' '}
            · {startDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
          </span>
          <span className="text-ink">
            {currency === 'NGN' ? formatNaira(customerPriceTotal) : `${currency} ${customerPriceTotal}`}
          </span>
        </div>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-ink-muted" />
    </Link>
  );
}
