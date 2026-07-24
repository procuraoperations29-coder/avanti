import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import { PageShell } from '@/components/shell/page-shell';

/**
 * Shared chrome for /customer/*: one sign-in gate, one PageShell/TopNav.
 * Previously every page repeated `if (!user) redirect('/sign-in')` and its
 * own <PageShell> — two pages (engagements/[id], drivers/[id]/book) had
 * neither, so they rendered with no nav at all. Pages that need a role
 * check beyond "signed in" (e.g. individual_customer only) still do that
 * check themselves.
 */
export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthUser();
  if (!user) redirect('/sign-in');

  return <PageShell>{children}</PageShell>;
}
