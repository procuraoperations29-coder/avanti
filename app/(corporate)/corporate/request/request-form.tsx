'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Send, Check } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

export function DriverRequestForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const [count, setCount] = useState('1');
  const [requirements, setRequirements] = useState('');
  const [startDate, setStartDate] = useState('');

  const submit = async () => {
    const n = Number(count);
    if (!n || n < 1) return toast.error('How many drivers do you need?');
    if (requirements.trim().length < 10) return toast.error('Tell us a bit more about what you need.');

    setBusy(true);
    try {
      const res = await fetch('/api/corporate/driver-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numberOfDrivers: n,
          requirements: requirements.trim(),
          preferredStartDate: startDate || null,
        }),
      });
      const body = (await res.json()) as { ok?: boolean; error?: string; message?: string };
      if (!res.ok) {
        toast.error(body.message ?? body.error ?? 'Could not submit your request');
        return;
      }
      setSent(true);
      toast.success('Request sent');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not submit your request');
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <div className="rounded-2xl border border-admin-green/30 bg-admin-green-soft p-8 shadow-admin">
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-admin-green-soft px-2 py-0.5 font-body text-[11px] font-medium uppercase tracking-wide text-admin-green-text">
          <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
          Request received
        </div>
        <p className="max-w-2xl font-display text-2xl font-semibold leading-snug tracking-tight text-admin-text md:text-3xl">
          Thank you. We&apos;re on it.
        </p>
        <p className="mt-4 max-w-xl font-body leading-relaxed text-admin-text-muted">
          Our team will source and vet the drivers you need, then assign them to your account. You&apos;ll
          see them on your dashboard as they&apos;re confirmed.
        </p>
      </div>
    );
  }

  const inputClass =
    'w-full rounded-xl border border-admin-border bg-admin-card px-3 py-2.5 font-body text-sm text-admin-text shadow-admin-sm outline-none placeholder:text-admin-text-muted focus:border-admin-green focus:ring-2 focus:ring-admin-green/20';

  return (
    <div className="rounded-2xl border border-admin-border bg-admin-card p-6 shadow-admin">
      <div className="space-y-5">
        <label className="block">
          <span className="mb-2 block font-body text-[12px] font-medium text-admin-text">
            How many drivers do you need?
          </span>
          <input
            type="number"
            min={1}
            className={`${inputClass} max-w-[140px] tabular-nums`}
            value={count}
            onChange={(e) => setCount(e.target.value)}
          />
        </label>

        <label className="block">
          <span className="mb-2 block font-body text-[12px] font-medium text-admin-text">
            What do you need them for?
          </span>
          <textarea
            className={`${inputClass} resize-none leading-relaxed`}
            rows={4}
            value={requirements}
            onChange={(e) => setRequirements(e.target.value)}
            placeholder="e.g. 3 executive drivers for our management team, Mon–Fri, automatic SUVs. Early starts, occasional weekend travel. Lagos mainland and island."
          />
        </label>

        <label className="block">
          <span className="mb-2 block font-body text-[12px] font-medium text-admin-text">
            Preferred start date <span className="font-normal text-admin-text-muted">(optional)</span>
          </span>
          <input
            type="date"
            className={`${inputClass} max-w-xs`}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </label>

        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={submit}
            disabled={busy}
            className="inline-flex min-w-[200px] items-center justify-center gap-2 rounded-xl bg-admin-green px-5 py-3 font-body text-sm font-medium text-admin-navy-2 shadow-admin-sm transition-all hover:brightness-95 disabled:opacity-60"
          >
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
                Sending…
              </>
            ) : (
              <>
                <Send className="h-4 w-4" strokeWidth={2} />
                Send request
              </>
            )}
          </button>
          <p className="font-body text-[12px] text-admin-text-muted">We&apos;ll source and vet the drivers.</p>
        </div>
      </div>
    </div>
  );
}
