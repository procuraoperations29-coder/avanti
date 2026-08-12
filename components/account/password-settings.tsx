'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, KeyRound } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

/**
 * PasswordSettings — set a password (users who only have email-code sign-in)
 * or change an existing one. Posts to /api/auth/password/set.
 */
export function PasswordSettings({ hasPassword }: { hasPassword: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (password.length < 8) return void toast.error('Use at least 8 characters');
    if (password !== confirm) return void toast.error('Passwords don’t match');
    setBusy(true);
    try {
      const res = await fetch('/api/auth/password/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const b = (await res.json()) as { ok?: boolean; error?: string; message?: string };
      if (!res.ok) return void toast.error(b.message ?? b.error ?? 'Could not save password');
      toast.success(hasPassword ? 'Password changed' : 'Password set');
      setOpen(false);
      setPassword('');
      setConfirm('');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save password');
    } finally {
      setBusy(false);
    }
  };

  const input =
    'w-full rounded-xl border border-admin-border bg-admin-bg px-3 py-2 font-body text-sm text-admin-text outline-none focus:border-admin-green focus:ring-2 focus:ring-admin-green/20';

  return (
    <div className="overflow-hidden rounded-2xl border border-admin-border bg-admin-card shadow-admin-sm">
      {!open ? (
        <div className="flex items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <KeyRound className="h-4 w-4 text-admin-text-muted" strokeWidth={1.75} />
            <div>
              <div className="font-body text-sm font-medium text-admin-text">{hasPassword ? 'Password set' : 'No password yet'}</div>
              <div className="font-body text-[12px] text-admin-text-muted">
                {hasPassword ? 'Change it any time.' : 'Set one to sign in without an email code.'}
              </div>
            </div>
          </div>
          <button onClick={() => setOpen(true)} className="shrink-0 rounded-lg border border-admin-border px-3 py-1.5 font-body text-[13px] font-medium text-admin-text hover:bg-admin-bg">
            {hasPassword ? 'Change' : 'Set password'}
          </button>
        </div>
      ) : (
        <div className="space-y-3 px-6 py-5">
          <input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New password (min 8 characters)" className={input} />
          <input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()} placeholder="Confirm password" className={input} />
          <div className="flex justify-end gap-2">
            <button onClick={() => { setOpen(false); setPassword(''); setConfirm(''); }} className="rounded-lg px-3 py-1.5 font-body text-[13px] text-admin-text-muted hover:text-admin-text">Cancel</button>
            <button onClick={save} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-admin-green px-3 py-1.5 font-body text-[13px] font-semibold text-admin-navy-2 hover:bg-admin-green/90 disabled:opacity-50">
              {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
