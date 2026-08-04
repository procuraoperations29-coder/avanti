'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Check } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

const INPUT =
  'w-full rounded-xl border border-admin-border bg-admin-bg px-3 py-2 font-body text-sm text-admin-text outline-none focus:border-admin-green focus:ring-2 focus:ring-admin-green/20';
const LABEL = 'mb-1.5 block font-body text-[12px] font-medium uppercase tracking-wide text-admin-text-muted';

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'Français' },
  { value: 'pt', label: 'Português' },
  { value: 'sw', label: 'Kiswahili' },
];
const CURRENCIES = ['NGN', 'GHS', 'KES', 'ZAR', 'USD', 'EUR', 'GBP'];

export function ProfileForm({
  fullName,
  displayName,
  preferredLanguage,
  preferredCurrency,
}: {
  fullName: string;
  displayName: string | null;
  preferredLanguage: string | null;
  preferredCurrency: string | null;
}) {
  const router = useRouter();
  const [name, setName] = useState(fullName);
  const [display, setDisplay] = useState(displayName ?? '');
  const [lang, setLang] = useState(preferredLanguage ?? 'en');
  const [currency, setCurrency] = useState(preferredCurrency ?? 'NGN');
  const [busy, setBusy] = useState(false);

  const dirty =
    name.trim() !== fullName ||
    (display.trim() || '') !== (displayName ?? '') ||
    lang !== (preferredLanguage ?? 'en') ||
    currency !== (preferredCurrency ?? 'NGN');

  async function save() {
    if (!name.trim()) return toast.error('Name is required.');
    setBusy(true);
    try {
      const res = await fetch('/api/account/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: name.trim(),
          displayName: display.trim() || null,
          preferredLanguage: lang,
          preferredCurrency: currency,
        }),
      });
      const b = (await res.json()) as { ok?: boolean; error?: string; message?: string };
      if (!res.ok) {
        toast.error(b.message ?? b.error ?? 'Could not save');
        return;
      }
      toast.success('Profile updated');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-admin-border bg-admin-card p-6 shadow-admin-sm">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className={LABEL}>Full name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} className={INPUT} placeholder="Your name" />
        </label>
        <label className="block">
          <span className={LABEL}>Display name</span>
          <input value={display} onChange={(e) => setDisplay(e.target.value)} className={INPUT} placeholder="What people call you" />
        </label>
        <label className="block">
          <span className={LABEL}>Language</span>
          <select value={lang} onChange={(e) => setLang(e.target.value)} className={INPUT}>
            {LANGUAGES.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={LABEL}>Preferred currency</span>
          <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={INPUT}>
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-5 flex justify-end">
        <button
          disabled={busy || !dirty}
          onClick={save}
          className="inline-flex items-center gap-2 rounded-xl bg-admin-navy px-5 py-2.5 font-body text-sm font-medium text-white shadow-admin-sm transition-colors hover:bg-admin-navy-2 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} /> : <Check className="h-4 w-4" strokeWidth={2.5} />}
          {dirty ? 'Save changes' : 'Saved'}
        </button>
      </div>
    </div>
  );
}
