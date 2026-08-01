'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Send, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';

/**
 * HireForm — customer submits a placement enquiry for a specific driver.
 *
 * No budget field (Avanti sets the salary). Contact detail defaults to
 * the customer's phone/email but can be edited.
 */

export function HireForm({
  driverId,
  driverFirstName,
  defaultContact,
}: {
  driverId: string;
  driverFirstName: string;
  defaultContact: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const [requirements, setRequirements] = useState('');
  const [startDate, setStartDate] = useState('');
  const [contactMethod, setContactMethod] = useState<'whatsapp' | 'email' | 'phone'>(
    'whatsapp'
  );
  const [contactDetail, setContactDetail] = useState(defaultContact);

  const submit = async () => {
    if (requirements.trim().length < 20) {
      toast.error('Please give us a bit more detail — at least a couple of sentences.');
      return;
    }
    if (!contactDetail.trim()) {
      toast.error('We need a way to reach you.');
      return;
    }

    setBusy(true);
    try {
      const res = await fetch('/api/customer/placement-enquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverId,
          requirements: requirements.trim(),
          preferredStartDate: startDate || null,
          contactMethod,
          contactDetail: contactDetail.trim(),
        }),
      });
      const body = (await res.json()) as { ok?: boolean; error?: string; message?: string };
      if (!res.ok) {
        toast.error(body.message ?? body.error ?? 'Could not submit enquiry');
        return;
      }
      setSent(true);
      toast.success('Enquiry sent');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not submit enquiry');
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <div className="rounded-2xl border border-admin-green/30 bg-admin-green-soft p-8 shadow-admin">
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-admin-green-soft px-2 py-0.5 font-body text-[11px] font-medium uppercase tracking-wide text-admin-green-text">
          <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
          Sent
        </div>
        <p className="max-w-2xl font-display text-2xl font-semibold leading-snug tracking-tight text-admin-text md:text-3xl">
          Thank you. We&apos;ll be in touch shortly.
        </p>
        <p className="mt-4 max-w-xl font-body leading-relaxed text-admin-text-muted">
          We&apos;ll confirm {driverFirstName}&apos;s availability and reach out at{' '}
          {contactDetail}. Usually within one business day.
        </p>
      </div>
    );
  }

  const labelClass =
    'mb-2 block font-body text-[12px] font-medium text-admin-text';
  const inputClass =
    'rounded-xl border-admin-border bg-admin-card text-admin-text shadow-admin-sm placeholder:text-admin-text-muted focus:border-admin-green focus:ring-2 focus:ring-admin-green/20';

  return (
    <div className="rounded-2xl border border-admin-border bg-admin-card p-6 shadow-admin md:p-8">
      <div className="space-y-6">
        {/* Requirements */}
        <div>
          <label className={labelClass}>What do you need {driverFirstName} for?</label>
          <textarea
            value={requirements}
            onChange={(e) => setRequirements(e.target.value.slice(0, 1000))}
            rows={4}
            placeholder="e.g. School run in Ikoyi Mon-Fri, plus occasional weekend errands. Automatic sedan. Prefer someone with executive experience."
            className="w-full resize-none rounded-xl border border-admin-border bg-admin-card p-3 font-body text-base leading-relaxed text-admin-text shadow-admin-sm outline-none placeholder:text-admin-text-muted focus:border-admin-green focus:ring-2 focus:ring-admin-green/20"
          />
          <div className="mt-2 font-body text-[11px] tabular-nums text-admin-text-muted">
            {requirements.length}/1000
          </div>
        </div>

        {/* Preferred start date */}
        <div>
          <label className={labelClass}>
            Preferred start date{' '}
            <span className="font-normal text-admin-text-muted">(optional)</span>
          </label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className={`max-w-xs ${inputClass}`}
          />
        </div>

        {/* Contact method */}
        <div>
          <label className={labelClass}>How should we reach you?</label>
          <div className="flex flex-wrap gap-2">
            {(['whatsapp', 'phone', 'email'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setContactMethod(m)}
                className={
                  'rounded-xl border px-4 py-2 font-body text-sm font-medium capitalize transition-all ' +
                  (contactMethod === m
                    ? 'border-admin-green bg-admin-green-soft text-admin-green-text shadow-admin-sm'
                    : 'border-admin-border bg-admin-bg text-admin-text hover:border-admin-green/40')
                }
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Contact detail */}
        <div>
          <label className={labelClass}>
            {contactMethod === 'email' ? 'Your email' : 'Your phone number'}
          </label>
          <Input
            value={contactDetail}
            onChange={(e) => setContactDetail(e.target.value)}
            className={`max-w-md ${inputClass}`}
            placeholder={contactMethod === 'email' ? 'you@example.com' : '+234...'}
          />
        </div>

        <div className="pt-4">
          <Button
            onClick={submit}
            disabled={busy}
            size="lg"
            className="min-w-[220px] border-admin-green bg-admin-green text-admin-navy-2 shadow-admin-sm hover:bg-admin-green hover:brightness-95 disabled:opacity-60"
          >
            {busy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" strokeWidth={1.5} />
                Sending…
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" strokeWidth={1.5} />
                Send enquiry
              </>
            )}
          </Button>
        </div>
      </div>

      <p className="mt-8 border-t border-admin-border pt-6 font-body text-[12px] leading-relaxed text-admin-text-muted">
        We&apos;ll confirm {driverFirstName}&apos;s availability and reach out within one
        business day. No obligation until you sign a contract.
      </p>
    </div>
  );
}
