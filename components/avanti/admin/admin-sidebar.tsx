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
} from 'lucide-react';
import { Logo } from '@/components/brand/logo';

export type AdminNavKey =
  | 'dashboard'
  | 'verification'
  | 'placements'
  | 'support'
  | 'finance'
  | 'compliance'
  | 'system';

interface AdminSidebarProps {
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

/** Longest-prefix match against the current path — `/admin` only matches exactly. */
function useActiveKey(): AdminNavKey {
  const pathname = usePathname();
  if (pathname.startsWith('/admin/system')) return 'system';
  const match = [...NAV_ITEMS]
    .filter((item) => item.key !== 'dashboard')
    .find((item) => pathname.startsWith(item.href));
  if (match) return match.key;
  return 'dashboard';
}

/**
 * AdminSidebar — persistent left nav for the admin dashboard. Wired into
 * app/(admin)/layout.tsx as the single source of chrome for every admin
 * route (previously each page rendered its own copy alongside a separate
 * TopNav, producing doubled-up chrome).
 */
export function AdminSidebar({
  canVerify,
  canPlacements,
  canSupport,
  canFinance,
  canCompliance,
  isSuper,
}: AdminSidebarProps) {
  const active = useActiveKey();

  const visible: Record<AdminNavKey, boolean> = {
    dashboard: true,
    verification: canVerify,
    placements: canPlacements,
    support: canSupport,
    finance: canFinance,
    compliance: canCompliance,
    system: isSuper,
  };

  return (
    <div className="w-[220px] shrink-0 bg-ink px-3 py-5">
      <div className="mb-7 px-2">
        <Link href="/admin">
          <Logo variant="full" size="sm" tone="light" />
        </Link>
      </div>

      <div className="mb-2 px-3 font-mono text-[10px] uppercase tracking-[0.1em] text-paper/50">
        Overview
      </div>
      <nav className="mb-5 flex flex-col gap-0.5">
        {NAV_ITEMS.slice(0, 3)
          .filter((item) => visible[item.key])
          .map((item) => (
            <NavLink key={item.key} item={item} isActive={active === item.key} />
          ))}
      </nav>

      <div className="mb-2 px-3 font-mono text-[10px] uppercase tracking-[0.1em] text-paper/50">
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
          <div className="mb-2 mt-5 px-3 font-mono text-[10px] uppercase tracking-[0.1em] text-paper/50">
            Super admin
          </div>
          <nav className="flex flex-col gap-0.5">
            <NavLink
              item={{ key: 'system', href: '/admin/system', label: 'System', Icon: LayoutGrid }}
              isActive={active === 'system'}
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
          ? 'bg-green text-ink-2 font-medium'
          : 'text-paper/70 hover:bg-ink-2 hover:text-white')
      }
    >
      <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
      {label}
    </Link>
  );
}
