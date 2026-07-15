import { cn } from '@/lib/utils/cn';
import type { TierLevel } from './tier-badge';

/**
 * Portrait — the driver's face (or initials fallback).
 *
 * Design goals:
 *   - Editorial framing: sharp corners, tier-colour ring
 *   - Real photo when available; graceful initials fallback
 *   - Two shapes: 'circle' (default, list rows) and 'square' (editorial hero)
 *
 * The tier ring is a coloured outline in the driver's tier colour.
 * T0 (unverified) has no ring.
 */

export interface PortraitProps {
  initials: string;
  imageUrl?: string | null;
  imageAlt?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
  tier?: TierLevel;
  variant?: 'circle' | 'square';
  className?: string;
}

const SIZE = {
  xs: { box: 'h-6 w-6', text: 'text-[10px]', ring: 'ring-[1.5px]' },
  sm: { box: 'h-8 w-8', text: 'text-xs', ring: 'ring-[1.5px]' },
  md: { box: 'h-12 w-12', text: 'text-sm', ring: 'ring-2' },
  lg: { box: 'h-16 w-16', text: 'text-lg', ring: 'ring-2' },
  xl: { box: 'h-24 w-24', text: 'text-2xl', ring: 'ring-[3px]' },
  xxl: { box: 'h-64 w-64 md:h-80 md:w-80', text: 'text-6xl md:text-7xl', ring: 'ring-4' },
} as const;

const TIER_RING = {
  t0: '',
  t1: 'ring-tier-1',
  t2: 'ring-tier-2',
  t3: 'ring-tier-3',
  t4: 'ring-tier-4',
} as const;

export function Portrait({
  initials,
  imageUrl,
  imageAlt,
  size = 'md',
  tier = 't0',
  variant = 'circle',
  className,
}: PortraitProps) {
  const s = SIZE[size];
  const shape = variant === 'square' ? '' : 'rounded-full';
  const ring = tier === 't0' ? '' : cn(s.ring, TIER_RING[tier], 'ring-offset-2 ring-offset-paper');

  return (
    <div
      className={cn(
        'relative flex items-center justify-center bg-paper-3 overflow-hidden',
        s.box,
        shape,
        ring,
        className
      )}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={imageAlt ?? initials}
          className="h-full w-full object-cover"
        />
      ) : (
        <span
          className={cn(
            'font-display text-ink select-none',
            s.text
          )}
          aria-label={initials}
        >
          {initials}
        </span>
      )}
    </div>
  );
}
