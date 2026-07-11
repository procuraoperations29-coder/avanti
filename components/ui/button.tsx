import { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils/cn';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper',
  {
    variants: {
      variant: {
        primary: 'bg-ink text-paper border border-ink hover:bg-ink-2 hover:-translate-y-px',
        secondary: 'bg-transparent text-ink border border-line-strong hover:bg-paper-2 hover:-translate-y-px',
        ghost: 'bg-transparent text-ink border border-transparent hover:bg-paper-2',
        danger: 'bg-oxblood text-paper border border-oxblood hover:opacity-90 hover:-translate-y-px',
        success: 'bg-green text-white border border-green hover:opacity-90 hover:-translate-y-px',
        link: 'bg-transparent text-ink underline underline-offset-4 hover:text-ink-2',
      },
      size: {
        sm: 'text-xs px-3 py-1.5',
        md: 'text-sm px-4 py-2.5',
        lg: 'text-base px-6 py-3',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
);
Button.displayName = 'Button';

export { buttonVariants };
