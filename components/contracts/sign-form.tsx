'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

/**
 * Electronic signing: the signer types their full name and confirms; today's
 * date is captured automatically. On success, either redirect (e.g. to Paystack
 * when the response returns a URL) or refresh the page.
 */
export function SignForm({
  endpoint,
  expectedName,
  submitLabel,
  theme = 'admin',
}: {
  endpoint: string;
  expectedName?: string | null;
  submitLabel: string;
  theme?: 'admin' | 'paper';
}) {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  const t = theme === 'paper'
    ? { card: 'border-line bg-paper-2', label: 'text-ink-muted', input: 'border-line bg-paper text-ink focus:border-ink', muted: 'text-ink-muted', btn: 'bg-ink text-paper hover:bg-ink/90' }
    : { card: 'border-admin-border bg-admin-card', label: 'text-admin-text-muted', input: 'border-admin-border bg-admin-bg text-admin-text focus:border-admin-green focus:ring-2 focus:ring-admin-green/20', muted: 'text-admin-text-muted', btn: 'bg-admin-green text-admin-navy-2 hover:bg-admin-green/90' };

  async function submit() {
    if (fullName.trim().length < 3) return void toast.error('Please type your full name to sign.');
    if (!agreed) return void toast.error('Please confirm you have read and agree.');
    setBusy(true);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: fullName.trim() }),
      });
      const b = (await res.json()) as { ok?: boolean; authorizationUrl?: string; error?: string; message?: string };
      if (!res.ok) return void toast.error(b.message ?? b.error ?? 'Could not sign');
      if (b.authorizationUrl) {
        window.location.href = b.authorizationUrl;
        return;
      }
      toast.success('Signed');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not sign');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${t.card}`}>
      <div className={`mb-1 font-body text-[13px] font-semibold ${theme === 'paper' ? 'text-ink' : 'text-admin-text'}`}>Sign electronically</div>
      <p className={`mb-4 font-body text-[12px] ${t.muted}`}>Type your full legal name to sign. Today&apos;s date ({today}) is recorded with your signature.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label>
          <span className={`mb-1 block font-body text-[11px] uppercase tracking-wide ${t.label}`}>Full name</span>
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder={expectedName ?? 'Your full legal name'} className={`w-full rounded-xl border px-3 py-2 font-body text-sm outline-none ${t.input}`} />
        </label>
        <label>
          <span className={`mb-1 block font-body text-[11px] uppercase tracking-wide ${t.label}`}>Date</span>
          <input value={today} readOnly className={`w-full rounded-xl border px-3 py-2 font-body text-sm ${t.input} opacity-70`} />
        </label>
      </div>
      <label className={`mt-3 flex items-start gap-2 font-body text-[12px] ${theme === 'paper' ? 'text-ink' : 'text-admin-text'}`}>
        <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5" />
        <span>I have read and agree to the terms of this agreement, and I am signing it electronically.</span>
      </label>
      <button onClick={submit} disabled={busy} className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 font-body text-sm font-semibold shadow-sm transition-colors disabled:opacity-50 ${t.btn}`}>
        {busy && <Loader2 className="h-4 w-4 animate-spin" />} {submitLabel}
      </button>
    </div>
  );
}
