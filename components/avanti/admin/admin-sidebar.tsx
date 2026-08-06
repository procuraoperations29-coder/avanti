'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ClipboardList,
  UserCheck,
  Users,
  DollarSign,
  ShieldAlert,
  LayoutGrid,
  UserCog,
  Route,
  Building2,
  Tags,
  ScrollText,
  UsersRound,
} from 'lucide-react';
import { ThemeToggle } from './theme-toggle';

export type AdminNavKey =
  | 'dashboard'
  | 'verification'
  | 'placements'
  | 'trips'
  | 'corporate'
  | 'support'
  | 'finance'
  | 'pricing'
  | 'compliance'
  | 'audit'
  | 'system'
  | 'users'
  | 'staff';

interface AdminSidebarProps {
  canVerify: boolean;
  canPlacements: boolean;
  canSupport: boolean;
  canFinance: boolean;
  canCompliance: boolean;
  isSuper: boolean;
}

type NavItem = { key: AdminNavKey; href: string; label: string; Icon: typeof LayoutDashboard };

const OVERVIEW: NavItem[] = [
  { key: 'dashboard', href: '/admin', label: 'Dashboard', Icon: LayoutDashboard },
  { key: 'verification', href: '/admin/verification', label: 'Verification', Icon: ClipboardList },
  { key: 'placements', href: '/admin/placements', label: 'Placements', Icon: UserCheck },
];

const OPERATIONS: NavItem[] = [
  { key: 'support', href: '/admin/support', label: 'Users', Icon: Users },
  { key: 'trips', href: '/admin/trips', label: 'Trips', Icon: Route },
  { key: 'corporate', href: '/admin/corporate', label: 'Corporate', Icon: Building2 },
  { key: 'finance', href: '/admin/finance', label: 'Finance', Icon: DollarSign },
  { key: 'pricing', href: '/admin/pricing', label: 'Pricing', Icon: Tags },
  { key: 'compliance', href: '/admin/compliance', label: 'Compliance', Icon: ShieldAlert },
  { key: 'audit', href: '/admin/audit', label: 'Audit log', Icon: ScrollText },
];

const SUPER: NavItem[] = [
  { key: 'users', href: '/admin/users', label: 'User admin', Icon: UsersRound },
  { key: 'system', href: '/admin/system', label: 'System', Icon: LayoutGrid },
  { key: 'staff', href: '/admin/staff', label: 'Staff', Icon: UserCog },
];

/**
 * AdminSidebar — persistent left chrome for the fintech admin console.
 *
 * The active item is derived from the live pathname (client component), which
 * is why this no longer takes an `active` prop: the shared layout renders the
 * sidebar once and can't know which child route is showing. Role flags gate
 * which items appear.
 */
export function AdminSidebar({
  canVerify,
  canPlacements,
  canSupport,
  canFinance,
  canCompliance,
  isSuper,
}: AdminSidebarProps) {
  const pathname = usePathname();

  const visible: Record<AdminNavKey, boolean> = {
    dashboard: true,
    verification: canVerify,
    placements: canPlacements,
    trips: canSupport || canVerify || canFinance,
    corporate: canSupport || canVerify || canFinance,
    support: canSupport,
    finance: canFinance,
    pricing: canFinance,
    compliance: canCompliance,
    audit: canCompliance,
    system: isSuper,
    users: isSuper,
    staff: isSuper,
  };

  const overview = OVERVIEW.filter((i) => visible[i.key]);
  const operations = OPERATIONS.filter((i) => visible[i.key]);
  const superItems = SUPER.filter((i) => visible[i.key]);

  function isActive(href: string) {
    if (href === '/admin') return pathname === '/admin';
    return pathname === href || pathname.startsWith(href + '/');
  }

  return (
    <aside className="sticky top-0 flex h-dvh w-[240px] shrink-0 flex-col border-r border-admin-navy-2/50 bg-gradient-to-b from-admin-navy to-admin-navy-2">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-5 pb-6 pt-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-admin-green shadow-admin-glow">
          <span className="font-display text-sm font-bold text-admin-navy-2">A</span>
        </div>
        <div className="leading-none">
          <div className="font-display text-[15px] font-semibold tracking-tight text-white">Avanti</div>
          <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.18em] text-admin-nav-text">
            Console
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-3">
        <NavGroup label="Overview" items={overview} isActive={isActive} />
        {operations.length > 0 && (
          <NavGroup label="Operations" items={operations} isActive={isActive} className="mt-6" />
        )}
        {superItems.length > 0 && (
          <NavGroup label="Super admin" items={superItems} isActive={isActive} className="mt-6" />
        )}
      </div>

      {/* Theme */}
      <div className="border-t border-white/5 p-3">
        <ThemeToggle />
      </div>
    </aside>
  );
}

function NavGroup({
  label,
  items,
  isActive,
  className = '',
}: {
  label: string;
  items: NavItem[];
  isActive: (href: string) => boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="mb-1.5 px-3 font-mono text-[10px] uppercase tracking-[0.14em] text-admin-nav-text/60">
        {label}
      </div>
      <nav className="flex flex-col gap-0.5">
        {items.map((item) => (
          <NavLink key={item.key} item={item} active={isActive(item.href)} />
        ))}
      </nav>
    </div>
  );
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const { href, label, Icon } = item;
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={
        'group flex items-center gap-2.5 rounded-lg px-3 py-2 font-body text-[13px] transition-all ' +
        (active
          ? 'bg-admin-green font-semibold text-admin-navy-2 shadow-admin-glow'
          : 'text-admin-nav-text hover:bg-admin-navy-soft hover:text-white')
      }
    >
      <Icon
        className={active ? 'h-[17px] w-[17px] shrink-0' : 'h-[17px] w-[17px] shrink-0 opacity-80'}
        strokeWidth={active ? 2.25 : 1.75}
      />
      {label}
    </Link>
  );
}
