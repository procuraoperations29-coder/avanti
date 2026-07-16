'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SectionLabel } from '@/components/avanti/section-label';
import { PhoneInput } from '@/components/avanti/phone-input';
import { OtpInput } from '@/components/avanti/otp-input';
import { createClient } from '@/lib/supabase/client';

type Step = 'details' | 'otp' | 'done';

export default function CustomerSignUpPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>('details');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneValid, setPhoneValid] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const emailValid = /.+@.+\..+/.test(email.trim());
  const canContinue = fullName.trim().length >= 2 && emailValid && phoneValid;

  async function sendOtp() {
    setBusy(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          isSignup: true,
          fullName,
          phone,
          countryCode: 'NG',
        }),
      });
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

  async function verifyAndComplete(code: string) {
    setBusy(true);
    setErrorMsg(null);
    try {
      const verifyRes = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), code }),
      });
      if (!verifyRes.ok) {
        const body = await verifyRes.json().catch(() => ({}));
        throw new Error(body.message ?? 'Wrong code');
      }

      const completeRes = await fetch('/api/auth/signup/customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email: email.trim(), phone }),
      });
      if (!completeRes.ok) {
        const body = await completeRes.json().catch(() => ({}));
        throw new Error(body.message ?? 'Could not complete signup');
      }

      const supabase = createClient();
      await supabase.auth.refreshSession();

      setStep('done');
      setTimeout(() => router.push('/customer'), 1500);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const field = 'mt-3 w-full border border-line-strong bg-paper-2 p-3 font-body text-sm text-ink outline-none placeholder:text-ink-faint focus:border-ink';

  return (
    <div className="mx-auto max-w-md px-4 pt-16 sm:px-6">
      <Link
        href="/"
        className="mb-8 inline-flex items-center gap-1 font-mono text-xs uppercase tracking-wider text-ink-muted hover:text-ink"
      >
        <ChevronLeft className="h-3.5 w-3.5" /> Back
      </Link>

      {step === 'details' && (
        <div className="animate-fade-in">
          <SectionLabel>Create your account</SectionLabel>
          <h1 className="mb-2 mt-3 font-display text-4xl leading-tight text-ink">
            <em className="italic">Two minutes.</em>
          </h1>
          <p className="mb-8 max-w-md font-body text-ink-muted">
            You&apos;ll book drivers, sign contracts, and pay from your Avanti account.
          </p>

          <div className="mb-4">
            <SectionLabel>Your name</SectionLabel>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ada Okonkwo"
              autoFocus
              className={field}
            />
          </div>

          <div className="mb-4">
            <SectionLabel>Your email</SectionLabel>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ada@example.com"
              className={field}
            />
            <p className="mt-2 font-mono text-[10px] text-ink-muted">
              We&apos;ll send your sign-in code here
            </p>
          </div>

          <div className="mb-6">
            <SectionLabel>Your phone</SectionLabel>
            <div className="mt-3">
              <PhoneInput
                onChange={(e164, valid) => {
                  setPhone(e164);
                  setPhoneValid(valid);
                }}
              />
            </div>
            <p className="mt-2 font-mono text-[10px] text-ink-muted">
              For dispatch and support · not used for sign-in
            </p>
          </div>

          {errorMsg && <p className="mb-4 font-mono text-sm text-oxblood">{errorMsg}</p>}

          <Button size="lg" onClick={sendOtp} disabled={!canContinue || busy} className="w-full">
            {busy ? 'Sending…' : 'Continue'} <ArrowRight className="ml-2 h-4 w-4" />
          </Button>

          <p className="mt-6 font-body text-xs leading-relaxed text-ink-faint">
            By continuing you agree to Avanti&apos;s terms of service and privacy policy.
          </p>

          <p className="mt-6 font-body text-sm text-ink-muted">
            Already have an account?{' '}
            <Link href="/sign-in" className="font-medium text-ink underline">
              Sign in
            </Link>
          </p>
        </div>
      )}

      {step === 'otp' && (
        <div className="animate-slide-up">
          <SectionLabel>Check your inbox</SectionLabel>
          <h1 className="mb-2 mt-3 font-display text-4xl leading-tight text-ink">
            <em className="italic">Six digits.</em>
          </h1>
          <p className="mb-8 font-body text-ink-muted">
            Sent to <span className="font-mono">{email}</span>.
          </p>

          <OtpInput onComplete={verifyAndComplete} disabled={busy} autoFocus />

          {errorMsg && <p className="mt-6 text-center font-mono text-sm text-oxblood">{errorMsg}</p>}

          <div className="mt-8 text-center">
            <button
              onClick={() => setStep('details')}
              className="font-mono text-xs uppercase tracking-wider text-ink-muted hover:text-ink"
            >
              Change details
            </button>
          </div>
        </div>
      )}

      {step === 'done' && (
        <div className="animate-fade-in pt-8 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border-2 border-green">
            <Check className="h-7 w-7 text-green" strokeWidth={2.5} />
          </div>
          <SectionLabel>You&apos;re in</SectionLabel>
          <h1 className="mb-4 mt-3 font-display text-5xl leading-tight text-ink">
            <em className="italic">Welcome to Avanti.</em>
          </h1>
          <p className="font-body text-ink-muted">Taking you to your dashboard…</p>
        </div>
      )}
    </div>
  );
}
