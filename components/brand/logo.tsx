import { cn } from '@/lib/utils/cn';

/**
 * Avanti logo — recreated in code from the brand mark (a road curving
 * through the negative space of an "A", a driver-at-the-wheel badge, green
 * accent on the descender). Not a pixel-perfect trace of the source art —
 * a clean geometric interpretation that themes via currentColor + brand
 * tokens, so it works on both light and dark surfaces.
 */

const MARK_SIZE = {
  xs: 20,
  sm: 24,
  md: 32,
  lg: 44,
  xl: 64,
} as const;

const WORDMARK_TEXT = {
  xs: 'text-sm',
  sm: 'text-base',
  md: 'text-lg',
  lg: 'text-2xl',
  xl: 'text-4xl',
} as const;

export interface LogoProps {
  variant?: 'mark' | 'full';
  size?: keyof typeof MARK_SIZE;
  /** Force a color scheme independent of surrounding text color (e.g. always-light mark on a dark sidebar). */
  tone?: 'auto' | 'light';
  className?: string;
}

export function Logo({ variant = 'full', size = 'md', tone = 'auto', className }: LogoProps) {
  const px = MARK_SIZE[size];
  const wordmarkColor = tone === 'light' ? 'text-white' : 'text-ink';

  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark size={px} tone={tone} />
      {variant === 'full' && (
        <span className={cn('font-display font-bold tracking-tight', WORDMARK_TEXT[size], wordmarkColor)}>
          Avanti
        </span>
      )}
    </span>
  );
}

function LogoMark({ size, tone }: { size: number; tone: 'auto' | 'light' }) {
  const navy = tone === 'light' ? '#FFFFFF' : 'rgb(var(--ink))';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Avanti"
      role="img"
      className="shrink-0"
    >
      {/* Left leg of the A */}
      <path d="M50 8 L14 90 L32 90 L50 46 L68 90 L86 90 Z" fill={navy} />
      {/* Green accent filling the right descender, cut by the road */}
      <path d="M58 66 L68 90 L86 90 L69 50 Z" fill="rgb(var(--green))" />
      {/* Road curving up through the crossbar, exiting bottom-left */}
      <path
        d="M20 90 C 34 62, 40 46, 50 34 C 58 24, 66 20, 78 16"
        stroke={tone === 'light' ? 'rgba(255,255,255,0.9)' : 'rgb(var(--paper))'}
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
      />
      {/* Driver badge */}
      <circle cx="66" cy="70" r="11" fill={tone === 'light' ? 'rgba(255,255,255,0.16)' : 'rgb(var(--paper))'} />
      <circle cx="66" cy="66.5" r="3.1" fill={navy} />
      <path
        d="M58.5 76 C 58.5 70.8, 61.8 68, 66 68 C 70.2 68, 73.5 70.8, 73.5 76"
        fill={navy}
      />
    </svg>
  );
}
