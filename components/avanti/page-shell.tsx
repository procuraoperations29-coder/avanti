import { getAuthUser } from '@/lib/auth';
import { TopNav } from './top-nav';

/**
 * PageShell — the outer chrome for authenticated pages.
 *
 * Server component. Fetches the current user once and passes it to
 * TopNav so the role switcher can render without an extra client
 * fetch.
 *
 * Usage:
 *   export default async function CustomerHomePage() {
 *     // ... auth checks, data loads
 *     return (
 *       <PageShell>
 *         {contents}
 *       </PageShell>
 *     );
 *   }
 */

export async function PageShell({ children }: { children: React.ReactNode }) {
  const user = await getAuthUser();

  return (
    <div className="min-h-screen bg-paper">
      <TopNav user={user} />
      <main>{children}</main>
    </div>
  );
}
