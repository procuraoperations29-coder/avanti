'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';
import { SectionLabel } from '@/components/avanti/section-label';

/**
 * Sign in — editorial polish.
 *
 * Fixed: phone must be submitted in E.164 format ('+' prefixed).
 * The '+' prefix is visual in the input; we prepend it back on submit.
 */

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  return digits ? `+${digits}` : '';
}

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') ?? undefined;

  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('234');
  const [code, setCode] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const sendCode = async () => {
    const normalized = phone.replace(/\D/g, '');
    if (normalized.length < 10) {
      toast.error('Enter a full phone number including country code');
      return;
    }
    setSending(true);
    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: `+${normalized}` }),
      });
      const body = (await res.json()) as { error?: string; message?: string };
      if (!res.ok) {
        toast.error(body.message ?? body.error ?? 'Could not send code');
        return;
      }
      setStep('otp');
      toast.success('Code sent');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not send code');
    } finally {
      setSending(false);
    }
  };

  const verifyCode = async () => {
    if (code.length < 4) {
      toast.error('Enter the 6-digit code');
      return;
    }
    setVerifying(true);
    try {
      const normalized = phone.replace(/\D/g, '');
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: `+${normalized}`, code }),
      });
      const body = (await res.json()) as { error?: string; message?: string; redirectTo?: string };
      if (!res.ok) {
        toast.error(body.message ?? body.error ?? 'Verification failed');
        return;
      }
      const target = next ?? body.redirectTo ?? '/customer';
      router.push(target);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper">
      {/* Header */}
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-6xl items-baseline justify-between px-6 py-6">
          <Link href="/" className="font-display text-2xl tracking-tight text-ink">
            Avanti
          </Link>
          <Link
            href="/sign-up"
            className="font-mono text-xs uppercase tracking-wider text-ink-muted hover:text-ink"
          >
            New here? Sign up →
          </Link>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-16 px-6 py-16 md:grid-cols-5 md:py-24">
        {/* Copy column */}
        <div className="md:col-span-2">
          <SectionLabel>Sign in</SectionLabel>
          <h1 className="mt-4 font-display text-5xl leading-[1.05] text-ink md:text-6xl">
            {step === 'phone' ? (
              <>
                Welcome <em className="italic">back.</em>
              </>
            ) : (
              <>
                Check your <em className="italic">messages.</em>
              </>
            )}
          </h1>
          <p className="mt-6 max-w-md font-body leading-relaxed text-ink">
            {step === 'phone'
              ? "Enter your phone. We'll send you a one-time code — no passwords to remember."
              : `We sent a six-digit code to ${formatPhone(phone)}. Enter it below to sign in.`}
          </p>

          <div className="mt-12 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
            Est. 2026 · Lagos
          </div>
        </div>

        {/* Form column */}
        <div className="md:col-span-3">
          <div className="border border-line bg-paper-2 p-8 md:p-10">
            {step === 'phone' ? (
              <div className="space-y-6">
                <div>
                  <label
                    htmlFor="phone"
                    className="mb-2 block font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted"
                  >
                    Your phone
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm text-ink-muted">
                      +
                    </span>
                    <Input
                      id="phone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      autoFocus
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                      onKeyDown={(e) => e.key === 'Enter' && sendCode()}
                      placeholder="2348012345678"
                      className="pl-7 font-mono text-base"
                    />
                  </div>
                  <p className="mt-2 font-mono text-[10px] text-ink-muted">
                    Include your country code
                  </p>
                </div>

                <Button
                  onClick={sendCode}
                  disabled={sending}
                  size="lg"
                  className="w-full"
                >
                  {sending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" strokeWidth={1.5} />
                      Sending…
                    </>
                  ) : (
                    <>
                      Send my code
                      <ArrowRight className="ml-2 h-4 w-4" strokeWidth={1.5} />
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <label
                    htmlFor="code"
                    className="mb-2 block font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted"
                  >
                    Your six-digit code
                  </label>
                  <Input
                    id="code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    autoFocus
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    onKeyDown={(e) => e.key === 'Enter' && verifyCode()}
                    placeholder="123456"
                    maxLength={6}
                    className="text-center font-mono text-2xl tracking-[0.4em]"
                  />
                </div>

                <Button
                  onClick={verifyCode}
                  disabled={verifying}
                  size="lg"
                  className="w-full"
                >
                  {verifying ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" strokeWidth={1.5} />
                      Verifying…
                    </>
                  ) : (
                    <>
                      Verify and sign in
                      <ArrowRight className="ml-2 h-4 w-4" strokeWidth={1.5} />
                    </>
                  )}
                </Button>

                <button
                  onClick={() => {
                    setStep('phone');
                    setCode('');
                  }}
                  className="w-full font-mono text-xs uppercase tracking-wider text-ink-muted hover:text-ink"
                >
                  Use a different phone
                </button>
              </div>
            )}
          </div>

          <p className="mt-6 font-body text-sm text-ink-muted">
            New here?{' '}
            <Link href="/sign-up" className="text-ink underline decoration-brass underline-offset-4 hover:decoration-2">
              Create an account
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
