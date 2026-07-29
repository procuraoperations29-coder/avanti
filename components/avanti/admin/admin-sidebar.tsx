import Link from 'next/link';
import {
  LayoutDashboard,
  ClipboardList,
  UserCheck,
  Users,
  DollarSign,
  ShieldAlert,
  LayoutGrid,
  UserCog,
} from 'lucide-react';

export type AdminNavKey =
  | 'dashboard'
  | 'verification'
  | 'placements'
  | 'support'
  | 'finance'
  | 'compliance'
  | 'system'
  | 'staff';

interface AdminSidebarProps {
  active: AdminNavKey;
  canVerify: boolean;
  canPlacements: boolean;
  canSupport: boolean;
  canFinance: boolean;
  canCompliance: boolean;
  isSuper: boolean;
}

const NAV_ITEMS: {
  key: AdminNavKey;
  href: string;
  label: string;
  Icon: typeof LayoutDashboard;
}[] = [
  { key: 'dashboard', href: '/admin', label: 'Dashboard', Icon: LayoutDashboard },
  { key: 'verification', href: '/admin/verification', label: 'Verification', Icon: ClipboardList },
  { key: 'placements', href: '/admin/placements', label: 'Placements', Icon: UserCheck },
  { key: 'support', href: '/admin/support', label: 'Users', Icon: Users },
  { key: 'finance', href: '/admin/finance', label: 'Finance', Icon: DollarSign },
  { key: 'compliance', href: '/admin/compliance', label: 'Compliance', Icon: ShieldAlert },
];

/**
 * AdminSidebar — persistent left nav for the fintech-style admin redesign.
 *
 * Deliberately NOT a shared app/(admin)/layout.tsx yet — several admin
 * pages (verification, placements, compliance, finance index, system)
 * haven't been reviewed/redesigned, and each still renders its own
 * <PageShell> (with TopNav). Wrapping them all in a layout-level sidebar
 * before checking what those pages actually render risks doubled-up
 * chrome. This component is built standalone so it can be dropped into
 * each page's content area one at a time, and promoted to a shared
 * layout once every admin page has been reviewed.
 */
export function AdminSidebar({
  active,
  canVerify,
  canPlacements,
  canSupport,
  canFinance,
  canCompliance,
  isSuper,
}: AdminSidebarProps) {
  const visible: Record<AdminNavKey, boolean> = {
    dashboard: true,
    verification: canVerify,
    placements: canPlacements,
    support: canSupport,
    finance: canFinance,
    compliance: canCompliance,
    system: isSuper,
    staff: isSuper,
  };

  return (
    <div className="w-[220px] shrink-0 bg-admin-navy px-3 py-5">
      <div className="mb-7 flex items-center gap-2 px-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-admin-green">
          <span className="font-body text-xs font-medium text-admin-navy-2">A</span>
        </div>
        <span className="font-body text-[15px] font-medium text-white">Avanti</span>
      </div>

      <div className="mb-2 px-3 font-mono text-[10px] uppercase tracking-[0.1em] text-admin-nav-text/70">
        Overview
      </div>
      <nav className="mb-5 flex flex-col gap-0.5">
        {NAV_ITEMS.slice(0, 3)
          .filter((item) => visible[item.key])
          .map((item) => (
            <NavLink key={item.key} item={item} isActive={active === item.key} />
          ))}
      </nav>

      <div className="mb-2 px-3 font-mono text-[10px] uppercase tracking-[0.1em] text-admin-nav-text/70">
        Operations
      </div>
      <nav className="flex flex-col gap-0.5">
        {NAV_ITEMS.slice(3)
          .filter((item) => visible[item.key])
          .map((item) => (
            <NavLink key={item.key} item={item} isActive={active === item.key} />
          ))}
      </nav>

      {isSuper && (
        <>
          <div className="mb-2 mt-5 px-3 font-mono text-[10px] uppercase tracking-[0.1em] text-admin-nav-text/70">
            Super admin
          </div>
          <nav className="flex flex-col gap-0.5">
            <NavLink
              item={{ key: 'system', href: '/admin/system', label: 'System', Icon: LayoutGrid }}
              isActive={active === 'system'}
            />
            <NavLink
              item={{ key: 'staff', href: '/admin/staff', label: 'Staff', Icon: UserCog }}
              isActive={active === 'staff'}
            />
          </nav>
        </>
      )}
    </div>
  );
}

function NavLink({
  item,
  isActive,
}: {
  item: { href: string; label: string; Icon: typeof LayoutDashboard };
  isActive: boolean;
}) {
  const { href, label, Icon } = item;
  return (
    <Link
      href={href}
      className={
        'flex items-center gap-2.5 rounded-lg px-3 py-2 font-body text-[13px] transition-colors ' +
        (isActive
          ? 'bg-admin-green text-admin-navy-2 font-medium'
          : 'text-admin-nav-text hover:bg-admin-navy-soft hover:text-white')
      }
    >
      <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
      {label}
    </Link>
  );
}
