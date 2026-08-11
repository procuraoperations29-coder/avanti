'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
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
  Settings,
  LogOut,
  TrendingUp,
  PanelLeftClose,
  PanelLeftOpen,
  Megaphone,
  Car,
  CarFront,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils/cn';
import { ThemeToggle } from './theme-toggle';

export type AdminNavKey =
  | 'dashboard'
  | 'analytics'
  | 'verification'
  | 'drivers'
  | 'placements'
  | 'trips'
  | 'carhire'
  | 'corporate'
  | 'support'
  | 'notifications'
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
  userName: string;
  userEmail: string;
  roleLabel: string;
}

type NavItem = { key: AdminNavKey; href: string; label: string; Icon: typeof LayoutDashboard };

const OVERVIEW: NavItem[] = [
  { key: 'dashboard', href: '/admin', label: 'Dashboard', Icon: LayoutDashboard },
  { key: 'analytics', href: '/admin/analytics', label: 'Analytics', Icon: TrendingUp },
  { key: 'verification', href: '/admin/verification', label: 'Verification', Icon: ClipboardList },
  { key: 'drivers', href: '/admin/drivers', label: 'Drivers', Icon: Car },
  { key: 'placements', href: '/admin/placements', label: 'Placements', Icon: UserCheck },
];

const OPERATIONS: NavItem[] = [
  { key: 'support', href: '/admin/support', label: 'Users', Icon: Users },
  { key: 'trips', href: '/admin/trips', label: 'Trips', Icon: Route },
  { key: 'carhire', href: '/admin/car-hire', label: 'Car hire', Icon: CarFront },
  { key: 'corporate', href: '/admin/corporate', label: 'Corporate', Icon: Building2 },
  { key: 'notifications', href: '/admin/notifications', label: 'Notifications', Icon: Megaphone },
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

const STORAGE_KEY = 'avanti-admin-sidebar-collapsed';

/**
 * AdminSidebar — persistent left chrome for the fintech admin console.
 * Collapsible to an icon rail; the choice is remembered in localStorage.
 */
export function AdminSidebar({
  canVerify,
  canPlacements,
  canSupport,
  canFinance,
  canCompliance,
  isSuper,
  userName,
  userEmail,
  roleLabel,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem(STORAGE_KEY) === '1');
  }, []);

  function toggleCollapsed() {
    setCollapsed((c) => {
      const next = !c;
      try { localStorage.setItem(STORAGE_KEY, next ? '1' : '0'); } catch { /* ignore */ }
      return next;
    });
  }

  async function signOut() {
    await fetch('/api/auth/signout', { method: 'POST' });
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  const visible: Record<AdminNavKey, boolean> = {
    dashboard: true,
    analytics: canFinance || canSupport || isSuper,
    verification: canVerify,
    drivers: canVerify || canSupport || isSuper,
    placements: canPlacements,
    trips: canSupport || canVerify || canFinance,
    carhire: canSupport || canFinance,
    corporate: canSupport || canVerify || canFinance,
    support: canSupport,
    notifications: canSupport,
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
    <aside
      className={cn(
        'sticky top-0 flex h-dvh shrink-0 flex-col border-r border-admin-navy-2/50 bg-gradient-to-b from-admin-navy to-admin-navy-2 transition-[width] duration-200',
        collapsed ? 'w-[68px]' : 'w-[240px]'
      )}
    >
      {/* Brand + collapse toggle */}
      <div className={cn('flex pb-6 pt-6', collapsed ? 'flex-col items-center gap-3 px-2' : 'items-center justify-between px-5')}>
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-admin-green shadow-admin-glow">
            <span className="font-display text-sm font-bold text-admin-navy-2">A</span>
          </div>
          {!collapsed && (
            <div className="leading-none">
              <div className="font-display text-[15px] font-semibold tracking-tight text-white">Avanti</div>
              <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.18em] text-admin-nav-text">Console</div>
            </div>
          )}
        </div>
        <button
          onClick={toggleCollapsed}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand' : 'Collapse'}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-admin-nav-text transition-colors hover:bg-admin-navy-soft hover:text-white"
        >
          {collapsed ? <PanelLeftOpen className="h-[18px] w-[18px]" strokeWidth={1.75} /> : <PanelLeftClose className="h-[18px] w-[18px]" strokeWidth={1.75} />}
        </button>
      </div>

      {/* Navigation */}
      <div className={cn('flex-1 overflow-y-auto overflow-x-hidden', collapsed ? 'px-2' : 'px-3')}>
        <NavGroup label="Overview" items={overview} isActive={isActive} collapsed={collapsed} />
        {operations.length > 0 && <NavGroup label="Operations" items={operations} isActive={isActive} collapsed={collapsed} className="mt-6" />}
        {superItems.length > 0 && <NavGroup label="Super admin" items={superItems} isActive={isActive} collapsed={collapsed} className="mt-6" />}
      </div>

      {/* Account */}
      <div className={cn('border-t border-white/5', collapsed ? 'flex flex-col items-center gap-1 p-2' : 'p-3')}>
        {!collapsed && (
          <div className="mb-1 px-3 py-1.5">
            <div className="truncate font-body text-[13px] font-medium text-white">{userName}</div>
            <div className="truncate font-mono text-[10px] uppercase tracking-[0.12em] text-admin-green">{roleLabel}</div>
            <div className="truncate font-body text-[11px] text-admin-nav-text">{userEmail}</div>
          </div>
        )}
        <Link
          href="/settings"
          title="Settings"
          className={cn(
            'flex items-center rounded-lg font-body text-[13px] text-admin-nav-text transition-all hover:bg-admin-navy-soft hover:text-white',
            collapsed ? 'h-9 w-9 justify-center' : 'w-full gap-2.5 px-3 py-2'
          )}
        >
          <Settings className="h-[17px] w-[17px] shrink-0 opacity-80" strokeWidth={1.75} />
          {!collapsed && 'Settings'}
        </Link>
        <button
          onClick={signOut}
          title="Sign out"
          className={cn(
            'flex items-center rounded-lg text-left font-body text-[13px] text-admin-nav-text transition-all hover:bg-admin-navy-soft hover:text-white',
            collapsed ? 'h-9 w-9 justify-center' : 'w-full gap-2.5 px-3 py-2'
          )}
        >
          <LogOut className="h-[17px] w-[17px] shrink-0 opacity-80" strokeWidth={1.75} />
          {!collapsed && 'Sign out'}
        </button>
        {!collapsed && (
          <div className="mt-1">
            <ThemeToggle />
          </div>
        )}
      </div>
    </aside>
  );
}

function NavGroup({
  label,
  items,
  isActive,
  collapsed,
  className = '',
}: {
  label: string;
  items: NavItem[];
  isActive: (href: string) => boolean;
  collapsed: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      {!collapsed && (
        <div className="mb-1.5 px-3 font-mono text-[10px] uppercase tracking-[0.14em] text-admin-nav-text/60">{label}</div>
      )}
      <nav className="flex flex-col gap-0.5">
        {items.map((item) => (
          <NavLink key={item.key} item={item} active={isActive(item.href)} collapsed={collapsed} />
        ))}
      </nav>
    </div>
  );
}

function NavLink({ item, active, collapsed }: { item: NavItem; active: boolean; collapsed: boolean }) {
  const { href, label, Icon } = item;
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      title={collapsed ? label : undefined}
      className={cn(
        'group flex items-center rounded-lg font-body text-[13px] transition-all',
        collapsed ? 'h-10 w-10 justify-center' : 'gap-2.5 px-3 py-2',
        active
          ? 'bg-admin-green font-semibold text-admin-navy-2 shadow-admin-glow'
          : 'text-admin-nav-text hover:bg-admin-navy-soft hover:text-white'
      )}
    >
      <Icon
        className={active ? 'h-[17px] w-[17px] shrink-0' : 'h-[17px] w-[17px] shrink-0 opacity-80'}
        strokeWidth={active ? 2.25 : 1.75}
      />
      {!collapsed && label}
    </Link>
  );
}
