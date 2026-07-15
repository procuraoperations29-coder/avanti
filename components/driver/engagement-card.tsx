import Link from 'next/link';
import { ArrowRight, Clock } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { statusLabel, type EngagementStatus } from '@/lib/engagement/driver-transitions';

/**
 * DriverEngagementCard — one row in the driver's engagements list.
 *
 * Shows the customer name, engagement type, timing, driver payout
 * amount, and status. Info-isolated: never shows customer_price_total.
 */

export interface DriverEngagementCardProps {
  engagementId: string;
  customerName: string;
  engagementType: string;
  status: EngagementStatus;
  startsAt: string;
  currency: string;
  driverPayoutTotal: number;
}

function formatNaira(n: number): string {
  return `₦${n.toLocaleString('en-NG')}`;
}

const STATUS_STYLE: Record<string, string> = {
  confirmed: 'text-brass',
  activated: 'text-green',
  in_progress: 'text-green font-bold',
  completed: 'text-ink-muted',
  cancelled: 'text-oxblood',
};

export function DriverEngagementCard({
  engagementId,
  customerName,
  engagementType,
  status,
  startsAt,
  currency,
  driverPayoutTotal,
}: DriverEngagementCardProps) {
  const startDate = new Date(startsAt);
  const now = new Date();
  const isToday = startDate.toDateString() === now.toDateString();

  return (
    <Link
      href={`/driver/engagements/${engagementId}`}
      className="group flex items-center gap-4 border-b border-line px-4 py-4 transition-colors hover:bg-paper-3"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <div className="truncate font-body text-sm text-ink">{customerName}</div>
          <div
            className={cn(
              'font-mono text-[10px] uppercase tracking-wider',
              STATUS_STYLE[status] ?? 'text-ink-muted'
            )}
          >
            {statusLabel(status)}
          </div>
        </div>
        <div className="mt-1 flex items-baseline justify-between gap-2 font-mono text-xs text-ink-muted">
          <span className="flex items-center gap-1">
            {isToday && <Clock className="h-3 w-3" strokeWidth={2} />}
            {engagementType.replace(/_/g, ' ')} ·{' '}
            {isToday
              ? `Today, ${startDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
              : `${startDate.toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                })} · ${startDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`}
          </span>
          <span className="text-ink">
            {currency === 'NGN' ? formatNaira(driverPayoutTotal) : `${currency} ${driverPayoutTotal}`}
          </span>
        </div>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-ink-muted" />
    </Link>
  );
}
