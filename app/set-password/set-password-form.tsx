'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';

export function SetPasswordForm({ dest, allowSkip }: { dest: string; allowSkip: boolean }) {
  const router = useRouter();
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
      const body = (await res.json()) as { ok?: boolean; error?: string; message?: string };
      if (!res.ok) return void toast.error(body.message ?? body.error ?? 'Could not set password');
      toast.success('Password set — you can sign in with it next time');
      router.push(dest);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not set password');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <label htmlFor="pw" className="mb-2 block font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">New password</label>
        <Input id="pw" type="password" autoComplete="new-password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" className="font-mono text-base" />
      </div>
      <div>
        <label htmlFor="pw2" className="mb-2 block font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">Confirm password</label>
        <Input id="pw2" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()} placeholder="Re-enter password" className="font-mono text-base" />
      </div>
      <Button onClick={save} disabled={busy} size="lg" className="w-full">
        {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" strokeWidth={1.5} />Saving…</> : <>Save password<ArrowRight className="ml-2 h-4 w-4" strokeWidth={1.5} /></>}
      </Button>
      {allowSkip && (
        <button onClick={() => router.push(dest)} className="w-full font-mono text-xs uppercase tracking-wider text-ink-muted hover:text-ink">
          Skip for now
        </button>
      )}
    </div>
  );
}
