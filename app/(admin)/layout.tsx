import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import { AdminSidebar } from '@/components/avanti/admin/admin-sidebar';

/**
 * Shared chrome for every /admin/* route: one auth/role gate, one sidebar.
 * Previously each admin page re-implemented this gate and rendered both
 * a TopNav *and* an AdminSidebar, so every admin page showed two stacked
 * nav bars. Admin now gets sidebar-only chrome — no TopNav.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthUser();
  if (!user) redirect('/sign-in');

  const isAdmin =
    user.roles.includes('admin_verifier') ||
    user.roles.includes('admin_support') ||
    user.roles.includes('admin_finance') ||
    user.roles.includes('admin_compliance') ||
    user.roles.includes('super_admin');
  if (!isAdmin) redirect('/sign-in');

  const isSuper = user.roles.includes('super_admin');
  const canVerify = user.roles.includes('admin_verifier') || isSuper;
  const canSupport = user.roles.includes('admin_support') || isSuper;
  const canFinance = user.roles.includes('admin_finance') || isSuper;
  const canCompliance = user.roles.includes('admin_compliance') || isSuper;
  const canPlacements = canSupport || canVerify;

  return (
    <div className="flex min-h-dvh bg-admin-bg text-admin-text">
      <AdminSidebar
        canVerify={canVerify}
        canPlacements={canPlacements}
        canSupport={canSupport}
        canFinance={canFinance}
        canCompliance={canCompliance}
        isSuper={isSuper}
      />
      <div className="mx-auto min-w-0 max-w-6xl flex-1 px-5 py-7 sm:px-8">{children}</div>
    </div>
  );
}
