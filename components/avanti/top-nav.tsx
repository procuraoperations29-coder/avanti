'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut, User, ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { toast } from '@/components/ui/sonner';

/**
 * TopNav — the persistent top bar.
 *
 * Left: brand mark. Right: user menu with role switcher + sign out.
 *
 * The role switcher shows every role the user's JWT carries, and lets
 * them toggle active_role. On success, refreshes the router so pages
 * that depend on active_role reload with the new claim.
 */

interface TopNavUser {
  id: string;
  phone: string | null;
  email: string | null;
  fullName?: string | null;
  roles: string[];
  activeRole: string | null;
}

const ROLE_LABEL: Record<string, string> = {
  individual_customer: 'Customer',
  corporate_customer: 'Corporate',
  driver: 'Driver',
  admin_verifier: 'Verification',
  admin_support: 'Support',
  admin_finance: 'Finance',
  admin_compliance: 'Compliance',
  super_admin: 'Super admin',
};

const ROLE_HOME: Record<string, string> = {
  individual_customer: '/customer',
  corporate_customer: '/corporate',
  driver: '/driver',
  admin_verifier: '/admin',
  admin_support: '/admin',
  admin_finance: '/admin',
  admin_compliance: '/admin',
  super_admin: '/admin',
};

export function TopNav({ user }: { user: TopNavUser | null }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [switching, startSwitching] = useTransition();

  if (!user) {
    return (
      <header className="border-b border-line bg-paper-2">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="font-display text-xl text-ink">
            Avanti
          </Link>
          <Link
            href="/sign-in"
            className="font-mono text-xs uppercase tracking-wider text-ink hover:text-ink-2"
          >
            Sign in
          </Link>
        </div>
      </header>
    );
  }

  const availableRoles = user.roles;
  const activeRole = user.activeRole ?? availableRoles[0];

  const switchRole = (role: string) => {
    startSwitching(async () => {
      try {
        const res = await fetch('/api/auth/switch-role', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role }),
        });
        const body = (await res.json()) as { activeRole?: string; error?: string };
        if (!res.ok || !body.activeRole) {
          toast.error(body.error ?? 'Could not switch role');
          return;
        }
        setMenuOpen(false);
        toast.success(`Switched to ${ROLE_LABEL[body.activeRole] ?? body.activeRole}`);
        router.push(ROLE_HOME[body.activeRole] ?? '/');
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Switch failed');
      }
    });
  };

  const signOut = async () => {
    try {
      await fetch('/api/auth/signout', { method: 'POST' });
      router.push('/sign-in');
      router.refresh();
    } catch {
      // ignore
    }
  };

  return (
    <header className="border-b border-line bg-paper-2">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link
          href={ROLE_HOME[activeRole] ?? '/'}
          className="font-display text-xl text-ink hover:text-ink-2"
        >
          Avanti
        </Link>

        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 border border-line-strong bg-paper px-3 py-1.5 font-body text-sm text-ink transition-colors hover:bg-paper-3"
          >
            <User className="h-3.5 w-3.5 text-ink-muted" strokeWidth={1.5} />
            <span className="hidden sm:inline">
              {ROLE_LABEL[activeRole] ?? activeRole}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-ink-muted" strokeWidth={1.5} />
          </button>

          {menuOpen && (
            <>
              {/* Click-outside catch */}
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full z-20 mt-1 w-64 border border-line-strong bg-paper-2 shadow-lg">
                <div className="border-b border-line px-3 py-2">
                  <div className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                    Signed in as
                  </div>
                  <div className="mt-0.5 font-mono text-xs text-ink">
                    {user.phone ? `+${user.phone}` : user.email ?? '—'}
                  </div>
                </div>

                {availableRoles.length > 1 && (
                  <div className="border-b border-line py-1">
                    <div className="px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                      Switch role
                    </div>
                    {availableRoles.map((role) => {
                      const isActive = role === activeRole;
                      return (
                        <button
                          key={role}
                          onClick={() => !isActive && switchRole(role)}
                          disabled={switching || isActive}
                          className={cn(
                            'flex w-full items-center justify-between px-3 py-2 text-left font-body text-sm transition-colors',
                            isActive
                              ? 'bg-paper-3 text-ink'
                              : 'text-ink hover:bg-paper-3'
                          )}
                        >
                          <span>{ROLE_LABEL[role] ?? role}</span>
                          {isActive && <Check className="h-3.5 w-3.5 text-green" strokeWidth={2.5} />}
                        </button>
                      );
                    })}
                  </div>
                )}

                <button
                  onClick={signOut}
                  className="flex w-full items-center gap-2 px-3 py-2 font-body text-sm text-ink transition-colors hover:bg-paper-3"
                >
                  <LogOut className="h-3.5 w-3.5" strokeWidth={1.5} />
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
