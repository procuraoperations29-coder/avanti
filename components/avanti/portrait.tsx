'use client';

import * as React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils/cn';

export type PortraitSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type PortraitTier = 't0' | 't1' | 't2' | 't3' | 't4';

export interface PortraitProps {
  src?: string | null;
  alt?: string;
  initials?: string | null;
  size?: PortraitSize;
  tier?: PortraitTier | null;
  showRing?: boolean;
  className?: string;
}

const SIZE_CLASSES: Record<PortraitSize, string> = {
  xs: 'h-8 w-8',
  sm: 'h-10 w-10',
  md: 'h-14 w-14',
  lg: 'h-20 w-20',
  xl: 'h-32 w-32',
};

// Tier gets a colored ring — brass tones for verified tiers.
// T0 = no ring; T1 = faint; T2/T3 = brass; T4 = ink (top).
const TIER_RING: Record<PortraitTier, string> = {
  t0: 'ring-line',
  t1: 'ring-line-strong',
  t2: 'ring-brass-soft',
  t3: 'ring-brass',
  t4: 'ring-ink',
};

const RING_WIDTH: Record<PortraitSize, string> = {
  xs: 'ring-1',
  sm: 'ring-1',
  md: 'ring-2',
  lg: 'ring-2',
  xl: 'ring-[3px]',
};

const RING_OFFSET: Record<PortraitSize, string> = {
  xs: 'ring-offset-1',
  sm: 'ring-offset-2',
  md: 'ring-offset-2',
  lg: 'ring-offset-[3px]',
  xl: 'ring-offset-4',
};

export function Portrait({
  src,
  alt,
  initials,
  size = 'md',
  tier = null,
  showRing = true,
  className,
}: PortraitProps) {
  const fallback = (initials ?? alt ?? '?').slice(0, 2).toUpperCase();
  const useRing = showRing && tier !== null;

  return (
    <Avatar
      className={cn(
        SIZE_CLASSES[size],
        useRing && [
          RING_WIDTH[size],
          RING_OFFSET[size],
          'ring-offset-paper',
          TIER_RING[tier],
        ],
        className
      )}
    >
      {src ? <AvatarImage src={src} alt={alt ?? ''} /> : null}
      <AvatarFallback>{fallback}</AvatarFallback>
    </Avatar>
  );
}
