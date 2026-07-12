'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SectionLabel } from '@/components/avanti/section-label';
import { PhoneInput } from '@/components/avanti/phone-input';
import { OtpInput } from '@/components/avanti/otp-input';
import { createClient } from '@/lib/supabase/client';

/**
 * Sign-in page — phone OTP, two-step.
 * Step 1: phone → send OTP
 * Step 2: OTP → verify → redirect based on active role
 */

type Step = 'phone' | 'otp' | 'error_no_account';

export default function SignInPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [phoneValid, setPhoneValid] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function sendOtp() {
    setBusy(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, isSignup: false }),
      });
      if (res.status === 404) {
        setStep('error_no_account');
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? 'Could not send code');
      }
      setStep('otp');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp(code: string) {
    setBusy(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? 'Wrong code');
      }
      const data = (await res.json()) as { activeRole: string | null; needsCompletion: boolean };

      // Refresh session so client picks up the new claims
      const supabase = createClient();
      await supabase.auth.refreshSession();

      // Route based on their role
      if (data.needsCompletion) {
        router.push('/sign-up/customer');
        return;
      }
      switch (data.activeRole) {
        case 'individual_customer':
          router.push('/customer');
          break;
        case 'driver':
          router.push('/driver/onboarding/pending');
          break;
        case 'corporate_admin':
        case 'corporate_member':
          router.push('/corporate');
          break;
        case 'admin_verifier':
        case 'admin_support':
        case 'admin_finance':
        case 'admin_compliance':
        case 'super_admin':
          router.push('/admin');
          break;
        default:
          router.push('/');
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 pt-16 sm:px-6">
      <Link
        href="/"
        className="mb-8 inline-flex items-center gap-1 font-mono text-xs uppercase tracking-wider text-ink-muted hover:text-ink"
      >
        <ChevronLeft className="h-3.5 w-3.5" /> Back
      </Link>

      {step === 'phone' && (
        <div className="animate-fade-in">
          <SectionLabel>Sign in</SectionLabel>
          <h1 className="mb-2 mt-3 font-display text-4xl leading-tight text-ink">
            Welcome back.
          </h1>
          <p className="mb-8 max-w-md font-body text-ink-muted">
            We&apos;ll text you a six-digit code.
          </p>

          <div className="mb-6">
            <SectionLabel>Your phone</SectionLabel>
            <div className="mt-3">
              <PhoneInput onChange={(e164, valid) => { setPhone(e164); setPhoneValid(valid); }} autoFocus />
            </div>
          </div>

          {errorMsg && <p className="mb-4 font-mono text-sm text-oxblood">{errorMsg}</p>}

          <Button size="lg" onClick={sendOtp} disabled={!phoneValid || busy} className="w-full">
            {busy ? 'Sending…' : 'Send code'} <ArrowRight className="ml-2 h-4 w-4" />
          </Button>

          <p className="mt-8 font-body text-sm text-ink-muted">
            New to Avanti?{' '}
            <Link href="/sign-up/customer" className="font-medium text-ink underline">
              Create an account
            </Link>
          </p>
        </div>
      )}

      {step === 'otp' && (
        <div className="animate-slide-up">
          <SectionLabel>Enter the code</SectionLabel>
          <h1 className="mb-2 mt-3 font-display text-4xl leading-tight text-ink">
            <em className="italic">Six digits.</em>
          </h1>
          <p className="mb-8 font-body text-ink-muted">
            Sent to <span className="font-mono">{phone}</span>.
          </p>

          <OtpInput
            onComplete={verifyOtp}
            disabled={busy}
            autoFocus
          />

          {errorMsg && <p className="mt-6 text-center font-mono text-sm text-oxblood">{errorMsg}</p>}

          <div className="mt-8 text-center">
            <button
              onClick={() => setStep('phone')}
              className="font-mono text-xs uppercase tracking-wider text-ink-muted hover:text-ink"
            >
              Use a different number
            </button>
          </div>
        </div>
      )}

      {step === 'error_no_account' && (
        <div className="animate-fade-in">
          <SectionLabel>No account</SectionLabel>
          <h1 className="mb-6 mt-3 font-display text-4xl leading-tight text-ink">
            <em className="italic">Nothing on file.</em>
          </h1>
          <p className="mb-8 font-body leading-relaxed text-ink-muted">
            We don&apos;t recognise <span className="font-mono">{phone}</span>. Create an account, or try a different number.
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setStep('phone')}>
              Try again
            </Button>
            <Link
              href={`/sign-up/customer?phone=${encodeURIComponent(phone)}`}
              className="inline-flex items-center rounded-none border border-ink bg-ink px-4 py-2.5 text-sm font-medium text-paper hover:bg-ink-2"
            >
              Create account
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
