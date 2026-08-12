'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';
import { SectionLabel } from '@/components/avanti/section-label';
import { Logo } from '@/components/brand/logo';

/**
 * Sign in — password first, with an email-code fallback.
 *
 *   password mode : email + password → straight in.
 *   code mode     : email → 6-digit code (fallback, recovery, and for users
 *                   who haven't set a password yet). After a code sign-in we
 *                   nudge password-less users to /set-password.
 */

type Mode = 'password' | 'code-email' | 'code-otp';

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') ?? undefined;

  const [mode, setMode] = useState<Mode>('password');
  const [resetIntent, setResetIntent] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const emailValid = /.+@.+\..+/.test(email.trim());

  const goAfterAuth = (redirectTo?: string, hasPassword?: boolean) => {
    // After a code sign-in: prompt to set a password if they don't have one,
    // or if they came via "forgot password".
    if (mode !== 'password' && (resetIntent || hasPassword === false)) {
      const params = new URLSearchParams();
      if (next) params.set('next', next);
      if (resetIntent) params.set('reset', '1');
      router.push(`/set-password${params.toString() ? `?${params}` : ''}`);
      router.refresh();
      return;
    }
    router.push(next ?? redirectTo ?? '/customer');
    router.refresh();
  };

  const signInWithPassword = async () => {
    if (!emailValid) return void toast.error('Enter a valid email address');
    if (!password) return void toast.error('Enter your password');
    setBusy(true);
    try {
      const res = await fetch('/api/auth/password/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const body = (await res.json()) as { error?: string; message?: string; redirectTo?: string };
      if (!res.ok) return void toast.error(body.message ?? 'Incorrect email or password');
      goAfterAuth(body.redirectTo, true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setBusy(false);
    }
  };

  const sendCode = async () => {
    if (!emailValid) return void toast.error('Enter a valid email address');
    setBusy(true);
    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const body = (await res.json()) as { error?: string; message?: string };
      if (!res.ok) {
        if (body.error === 'user_not_found') return void toast.error('No account with that email — sign up first');
        return void toast.error(body.message ?? body.error ?? 'Could not send code');
      }
      setMode('code-otp');
      toast.success('Code sent — check your inbox');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not send code');
    } finally {
      setBusy(false);
    }
  };

  const verifyCode = async () => {
    if (code.length < 6) return void toast.error('Enter the 6-digit code');
    setBusy(true);
    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), code }),
      });
      const body = (await res.json()) as { error?: string; message?: string; redirectTo?: string; hasPassword?: boolean };
      if (!res.ok) return void toast.error(body.message ?? body.error ?? 'Verification failed');
      goAfterAuth(body.redirectTo, body.hasPassword);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setBusy(false);
    }
  };

  const heading =
    mode === 'code-otp' ? <>Check your <em className="italic">inbox.</em></> : <>Welcome <em className="italic">back.</em></>;
  const blurb =
    mode === 'password'
      ? 'Enter your email and password.'
      : mode === 'code-email'
        ? (resetIntent ? "Enter your email — we'll send a code so you can sign in and set a new password." : "Enter your email. We'll send you a one-time code.")
        : `We sent a six-digit code to ${email}. Enter it below.`;

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <Link href="/"><Logo /></Link>
          <Link href="/sign-up" className="font-mono text-xs uppercase tracking-wider text-ink-muted hover:text-ink">
            New here? Sign up →
          </Link>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-16 px-6 py-16 md:grid-cols-5 md:py-24">
        <div className="md:col-span-2">
          <SectionLabel>Sign in</SectionLabel>
          <h1 className="mt-4 font-display text-5xl leading-[1.05] text-ink md:text-6xl">{heading}</h1>
          <p className="mt-6 max-w-md font-body leading-relaxed text-ink">{blurb}</p>
          <div className="mt-12 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">Est. 2026 · Lagos</div>
        </div>

        <div className="md:col-span-3">
          <div className="border border-line bg-paper-2 p-8 md:p-10">
            {mode === 'password' && (
              <div className="space-y-6">
                <div>
                  <label htmlFor="email" className="mb-2 block font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">Your email</label>
                  <Input id="email" type="email" autoComplete="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="font-mono text-base" />
                </div>
                <div>
                  <label htmlFor="password" className="mb-2 block font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">Your password</label>
                  <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && signInWithPassword()} placeholder="••••••••" className="font-mono text-base" />
                </div>
                <Button onClick={signInWithPassword} disabled={busy} size="lg" className="w-full">
                  {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" strokeWidth={1.5} />Signing in…</> : <>Sign in<ArrowRight className="ml-2 h-4 w-4" strokeWidth={1.5} /></>}
                </Button>
                <div className="flex items-center justify-between font-mono text-xs uppercase tracking-wider text-ink-muted">
                  <button onClick={() => { setResetIntent(false); setMode('code-email'); }} className="hover:text-ink">Email me a code instead</button>
                  <button onClick={() => { setResetIntent(true); setMode('code-email'); }} className="hover:text-ink">Forgot password?</button>
                </div>
              </div>
            )}

            {mode === 'code-email' && (
              <div className="space-y-6">
                <div>
                  <label htmlFor="email2" className="mb-2 block font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">Your email</label>
                  <Input id="email2" type="email" autoComplete="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendCode()} placeholder="you@example.com" className="font-mono text-base" />
                </div>
                <Button onClick={sendCode} disabled={busy} size="lg" className="w-full">
                  {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" strokeWidth={1.5} />Sending…</> : <>Send my code<ArrowRight className="ml-2 h-4 w-4" strokeWidth={1.5} /></>}
                </Button>
                <button onClick={() => setMode('password')} className="w-full font-mono text-xs uppercase tracking-wider text-ink-muted hover:text-ink">← Back to password sign-in</button>
              </div>
            )}

            {mode === 'code-otp' && (
              <div className="space-y-6">
                <div>
                  <label htmlFor="code" className="mb-2 block font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">Your six-digit code</label>
                  <Input id="code" type="text" inputMode="numeric" autoComplete="one-time-code" autoFocus value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} onKeyDown={(e) => e.key === 'Enter' && verifyCode()} placeholder="123456" maxLength={6} className="text-center font-mono text-2xl tracking-[0.4em]" />
                </div>
                <Button onClick={verifyCode} disabled={busy} size="lg" className="w-full">
                  {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" strokeWidth={1.5} />Verifying…</> : <>Verify and sign in<ArrowRight className="ml-2 h-4 w-4" strokeWidth={1.5} /></>}
                </Button>
                <button onClick={() => { setMode('code-email'); setCode(''); }} className="w-full font-mono text-xs uppercase tracking-wider text-ink-muted hover:text-ink">Use a different email</button>
              </div>
            )}
          </div>

          <p className="mt-6 font-body text-sm text-ink-muted">
            New here?{' '}
            <Link href="/sign-up" className="text-ink underline decoration-brass underline-offset-4 hover:decoration-2">Create an account</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
