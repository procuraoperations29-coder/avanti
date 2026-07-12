import 'server-only';
import { getAuthUser } from '@/lib/auth';
import { TopNav } from './top-nav';
import { cn } from '@/lib/utils/cn';

/**
 * PageShell — wraps signed-in pages with the TopNav.
 *
 *   <PageShell><YourPage /></PageShell>
 *
 * If the user isn't signed in, the shell renders content raw (no nav).
 * For pages that MUST have a signed-in user, do the redirect check in
 * the page itself before rendering PageShell.
 *
 * Server component — reads the auth user on the server.
 */

export interface PageShellProps {
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
}

const MAX_WIDTH: Record<NonNullable<PageShellProps['maxWidth']>, string> = {
  sm: 'max-w-2xl',
  md: 'max-w-4xl',
  lg: 'max-w-6xl',
  xl: 'max-w-7xl',
  full: 'max-w-none',
};

export async function PageShell({
  children,
  maxWidth = 'lg',
  className,
}: PageShellProps) {
  const user = await getAuthUser();

  return (
    <div className="min-h-dvh bg-paper">
      {user && <TopNav user={user} />}
      <main className={cn('mx-auto px-4 py-8 sm:px-6', MAX_WIDTH[maxWidth], className)}>
        {children}
      </main>
    </div>
  );
}
