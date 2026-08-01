'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronDown, LogOut, RefreshCw, Settings } from 'lucide-react';
import { Portrait } from '@/components/avanti/portrait';
import { Logo } from '@/components/brand/logo';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import type { AuthUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils/cn';

/**
 * TopNav — the persistent header for signed-in users. Shows the Avanti
 * wordmark, primary nav (role-aware), and a user menu with role switcher +
 * sign out. On mobile, primary nav collapses; the user menu remains.
 */

export interface TopNavProps {
  user: AuthUser;
  className?: string;
}

const ROLE_LABEL: Record<string, string> = {
  individual_customer: 'Customer',
  driver: 'Driver',
  corporate_admin: 'Corporate admin',
  corporate_member: 'Corporate member',
  admin_verifier: 'Verifier',
  admin_support: 'Support',
  admin_finance: 'Finance',
  admin_compliance: 'Compliance',
  super_admin: 'Super admin',
};

const ROLE_LANDING: Record<string, string> = {
  individual_customer: '/customer',
  driver: '/driver/onboarding/step-pending',
  corporate_admin: '/corporate',
  corporate_member: '/corporate',
  admin_verifier: '/admin',
  admin_support: '/admin',
  admin_finance: '/admin',
  admin_compliance: '/admin',
  super_admin: '/admin',
};

export function TopNav({ user, className }: TopNavProps) {
  const router = useRouter();

  async function switchRole(role: string, organizationId?: string) {
    const res = await fetch('/api/auth/switch-role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, organizationId }),
    });
    if (!res.ok) return;
    const supabase = createClient();
    await supabase.auth.refreshSession();
    router.push(ROLE_LANDING[role] ?? '/');
    router.refresh();
  }

  async function signOut() {
    await fetch('/api/auth/signout', { method: 'POST' });
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  const otherRoles = user.roles.filter((r) => r !== user.activeRole);
  const initials = user.phone?.slice(-2) ?? '??';

  return (
    <header
      className={cn(
        'sticky top-0 z-30 border-b border-admin-border bg-admin-card/85 shadow-admin-sm backdrop-blur-md',
        className
      )}
    >
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        {/* Wordmark */}
        <Link href="/" className="leading-none">
          <Logo size="sm" />
        </Link>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-full border border-admin-border bg-admin-card py-1 pl-1 pr-2.5 shadow-admin-sm transition-colors hover:bg-admin-bg focus:outline-none">
              <Portrait initials={initials} size="sm" />
              <div className="hidden text-right sm:block">
                <div className="font-body text-[11px] font-medium text-admin-text">{user.phone}</div>
                <div className="font-body text-[10px] uppercase tracking-wide text-admin-text-muted">
                  {user.activeRole ? ROLE_LABEL[user.activeRole] ?? user.activeRole : 'Signed in'}
                </div>
              </div>
              <ChevronDown className="h-4 w-4 text-admin-text-muted" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[16rem]">
            <DropdownMenuLabel>Signed in</DropdownMenuLabel>
            <div className="px-3 pb-2">
              <div className="font-body text-sm font-medium text-admin-text">{user.phone}</div>
              {user.email && (
                <div className="font-body text-xs text-admin-text-muted">{user.email}</div>
              )}
            </div>
            {otherRoles.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Switch role</DropdownMenuLabel>
                {otherRoles.map((role) => (
                  <DropdownMenuItem key={role} onSelect={() => switchRole(role)}>
                    <RefreshCw className="mr-2 h-3.5 w-3.5" />
                    {ROLE_LABEL[role] ?? role}
                  </DropdownMenuItem>
                ))}
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings">
                <Settings className="mr-2 h-3.5 w-3.5" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={signOut}>
              <LogOut className="mr-2 h-3.5 w-3.5" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
