import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils/cn';

/**
 * Split out from button.tsx so Server Components can call buttonVariants()
 * directly as a plain function — button.tsx has 'use client' (required by
 * @radix-ui/react-slot's asChild support), and every export from a 'use
 * client' file is treated as a client reference, even plain non-component
 * functions. This file has no client-only dependency, so it stays a
 * regular server-safe module.
 */
export const buttonVariants = cva(
  cn(
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md',
    'font-body text-sm font-medium leading-none',
    'transition-colors focus-visible:outline-none',
    'disabled:pointer-events-none disabled:opacity-50'
  ),
  {
    variants: {
      variant: {
        default: 'border border-ink bg-ink text-paper hover:bg-ink-2',
        secondary: 'border border-line-strong bg-paper-2 text-ink hover:bg-paper-3',
        ghost: 'text-ink hover:bg-paper-2',
        destructive: 'border border-oxblood bg-oxblood text-paper hover:bg-oxblood/90',
        link: 'text-ink underline underline-offset-4 hover:text-ink-2',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-12 px-5 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);
