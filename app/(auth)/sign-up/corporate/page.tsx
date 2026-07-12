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

export default function CorporateSignUpPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('details');

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneValid, setPhoneValid] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [sector, setSector] = useState('');
  const [billingEmail, setBillingEmail] = useState('');

  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const canContinue =
    fullName.trim().length >= 2 &&
    phoneValid &&
    companyName.trim().length >= 2 &&
    /.+@.+\..+/.test(billingEmail);

  async function sendOtp() {
    setBusy(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, isSignup: true, fullName, countryCode: 'NG' }),
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
        body: JSON.stringify({ phone, code }),
      });
      if (!verifyRes.ok) {
        const body = await verifyRes.json().catch(() => ({}));
        throw new Error(body.message ?? 'Wrong code');
      }

      const completeRes = await fetch('/api/auth/signup/corporate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          companyName,
          legalName: legalName.trim() || undefined,
          registrationNumber: registrationNumber.trim() || undefined,
          sector: sector.trim() || undefined,
          billingEmail,
          countryCode: 'NG',
          defaultCurrency: 'NGN',
        }),
      });
      if (!completeRes.ok) {
        const body = await completeRes.json().catch(() => ({}));
        throw new Error(body.message ?? 'Could not complete signup');
      }

      const supabase = createClient();
      await supabase.auth.refreshSession();

      setStep('done');
      setTimeout(() => router.push('/corporate'), 1500);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const field = 'mt-3 w-full border border-line-strong bg-paper-2 p-3 font-body text-sm text-ink outline-none placeholder:text-ink-faint focus:border-ink';

  return (
    <div className="mx-auto max-w-md px-4 pt-16 sm:px-6 pb-24">
      <Link
        href="/"
        className="mb-8 inline-flex items-center gap-1 font-mono text-xs uppercase tracking-wider text-ink-muted hover:text-ink"
      >
        <ChevronLeft className="h-3.5 w-3.5" /> Back
      </Link>

      {step === 'details' && (
        <div className="animate-fade-in">
          <SectionLabel>For business</SectionLabel>
          <h1 className="mb-2 mt-3 font-display text-4xl leading-tight text-ink">
            <em className="italic">Set up your org.</em>
          </h1>
          <p className="mb-8 max-w-md font-body text-ink-muted">
            You&apos;ll be the primary admin. Your org will be reviewed before it can transact — usually within a business day.
          </p>

          <div className="mb-4">
            <SectionLabel>Your name</SectionLabel>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ada Okonkwo" autoFocus className={field} />
          </div>

          <div className="mb-4">
            <SectionLabel>Your phone</SectionLabel>
            <div className="mt-3">
              <PhoneInput onChange={(e164, valid) => { setPhone(e164); setPhoneValid(valid); }} />
            </div>
          </div>

          <div className="mb-4">
            <SectionLabel>Company name</SectionLabel>
            <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="FirstBank Nigeria" className={field} />
          </div>

          <div className="mb-4">
            <SectionLabel>Legal name · optional</SectionLabel>
            <input value={legalName} onChange={(e) => setLegalName(e.target.value)} placeholder="First Bank of Nigeria Limited" className={field} />
          </div>

          <div className="mb-4">
            <SectionLabel>RC number · optional</SectionLabel>
            <input value={registrationNumber} onChange={(e) => setRegistrationNumber(e.target.value)} placeholder="RC 6290" className={field} />
          </div>

          <div className="mb-4">
            <SectionLabel>Sector · optional</SectionLabel>
            <input value={sector} onChange={(e) => setSector(e.target.value)} placeholder="Banking" className={field} />
          </div>

          <div className="mb-6">
            <SectionLabel>Billing email</SectionLabel>
            <input type="email" value={billingEmail} onChange={(e) => setBillingEmail(e.target.value)} placeholder="billing@firstbank.com" className={field} />
          </div>

          {errorMsg && <p className="mb-4 font-mono text-sm text-oxblood">{errorMsg}</p>}

          <Button size="lg" onClick={sendOtp} disabled={!canContinue || busy} className="w-full">
            {busy ? 'Sending…' : 'Continue'} <ArrowRight className="ml-2 h-4 w-4" />
          </Button>

          <p className="mt-6 font-body text-sm text-ink-muted">
            Individual customer instead?{' '}
            <Link href="/sign-up/customer" className="font-medium text-ink underline">
              Personal account
            </Link>
          </p>
        </div>
      )}

      {step === 'otp' && (
        <div className="animate-slide-up">
          <SectionLabel>Confirm your number</SectionLabel>
          <h1 className="mb-2 mt-3 font-display text-4xl leading-tight text-ink">
            <em className="italic">Six digits.</em>
          </h1>
          <p className="mb-8 font-body text-ink-muted">
            Sent to <span className="font-mono">{phone}</span>.
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
          <SectionLabel>Organisation created</SectionLabel>
          <h1 className="mb-4 mt-3 font-display text-5xl leading-tight text-ink">
            <em className="italic">Verification pending.</em>
          </h1>
          <p className="font-body text-ink-muted">Taking you to your dashboard…</p>
        </div>
      )}
    </div>
  );
}
