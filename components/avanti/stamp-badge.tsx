import { Check, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

/**
 * StampBadge — credential display (Phase 2 §14.2). Green stamp aesthetic
 * for verified attributes: identity, background, defensive driving,
 * executive certified, first-aid, etc.
 *
 * Style: monospace uppercase text, green outline, check icon (or custom).
 * Sized to feel like an editorial stamp rather than a marketing pill.
 */

export interface StampBadgeProps {
  label: string;
  Icon?: LucideIcon;
  size?: 'sm' | 'md';
  variant?: 'filled' | 'outline';
  className?: string;
}

export function StampBadge({
  label,
  Icon = Check,
  size = 'md',
  variant = 'outline',
  className,
}: StampBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 border font-mono uppercase tracking-wider',
        variant === 'outline' && 'border-green bg-green-soft text-green',
        variant === 'filled' && 'border-green bg-green text-paper',
        size === 'sm' && 'h-5 px-1.5 text-[10px]',
        size === 'md' && 'h-6 px-2 text-xs',
        className
      )}
    >
      <Icon className={cn(size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5')} strokeWidth={2.5} />
      {label}
    </span>
  );
}
