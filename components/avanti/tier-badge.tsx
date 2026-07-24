import { cn } from '@/lib/utils/cn';

/**
 * TierBadge — driver verification tier (T0..T4). Phase 2 §14.2.
 *
 * T0: unverified — outline, muted
 * T1: identity only — outline, ink
 * T2: standard — filled brass-soft
 * T3: professional — filled brass
 * T4: executive — filled ink with subtle crest
 */

export type TierLevel = 't0' | 't1' | 't2' | 't3' | 't4';

export interface TierBadgeProps {
  tier: TierLevel;
  size?: 'sm' | 'md' | 'lg';
  label?: 'short' | 'long' | 'none';
  className?: string;
}

const TIER_TEXT: Record<TierLevel, { short: string; long: string }> = {
  t0: { short: 'T0', long: 'Unverified' },
  t1: { short: 'T1', long: 'Identity verified' },
  t2: { short: 'T2', long: 'Standard' },
  t3: { short: 'T3', long: 'Professional' },
  t4: { short: 'T4', long: 'Executive' },
};

const TIER_STYLES: Record<TierLevel, string> = {
  t0: 'border-line-strong bg-transparent text-ink-muted',
  t1: 'border-ink bg-transparent text-ink',
  t2: 'border-brass bg-brass-soft text-ink',
  t3: 'border-brass bg-brass text-paper',
  t4: 'border-ink bg-ink text-paper',
};

const SIZE_STYLES = {
  sm: 'h-5 px-1.5 text-[10px]',
  md: 'h-6 px-2 text-xs',
  lg: 'h-8 px-3 text-sm',
};

export function TierBadge({ tier, size = 'md', label = 'short', className }: TierBadgeProps) {
  const text = label === 'none' ? '' : TIER_TEXT[tier][label];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border font-mono uppercase tracking-wider',
        TIER_STYLES[tier],
        SIZE_STYLES[size],
        className
      )}
    >
      {label !== 'none' && text}
    </span>
  );
}
