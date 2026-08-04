'use client';

import { useMemo, useState } from 'react';
import { Loader2, Check } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

type Channel = 'email' | 'sms';
type Category = 'bookings' | 'payments' | 'marketing';

const ROWS: { category: Category; title: string; desc: string }[] = [
  { category: 'bookings', title: 'Bookings & jobs', desc: 'Driver matched, on the way, job completed' },
  { category: 'payments', title: 'Payments & invoices', desc: 'Receipts, invoices, payout confirmations' },
  { category: 'marketing', title: 'Product news', desc: 'New features and occasional offers' },
];

/** key = `${category}:${channel}` → enabled */
export function NotificationPrefs({ initial }: { initial: Record<string, boolean> }) {
  const [state, setState] = useState<Record<string, boolean>>(initial);
  const [busy, setBusy] = useState(false);

  const get = (c: Category, ch: Channel) => state[`${c}:${ch}`] ?? true;

  const dirty = useMemo(
    () => ROWS.some((r) => (['email', 'sms'] as Channel[]).some((ch) => get(r.category, ch) !== (initial[`${r.category}:${ch}`] ?? true))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state]
  );

  function toggle(c: Category, ch: Channel) {
    setState((s) => ({ ...s, [`${c}:${ch}`]: !(s[`${c}:${ch}`] ?? true) }));
  }

  async function save() {
    setBusy(true);
    try {
      const prefs = ROWS.flatMap((r) =>
        (['email', 'sms'] as Channel[]).map((ch) => ({ category: r.category, channel: ch, enabled: get(r.category, ch) }))
      );
      const res = await fetch('/api/account/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prefs }),
      });
      const b = (await res.json()) as { ok?: boolean; error?: string; message?: string };
      if (!res.ok) {
        toast.error(b.message ?? b.error ?? 'Could not save');
        return;
      }
      toast.success('Preferences saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-admin-border bg-admin-card shadow-admin-sm">
      <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-6 border-b border-admin-border px-6 py-3">
        <span className="font-body text-[11px] uppercase tracking-wide text-admin-text-muted">Category</span>
        <span className="w-12 text-center font-body text-[11px] uppercase tracking-wide text-admin-text-muted">Email</span>
        <span className="w-12 text-center font-body text-[11px] uppercase tracking-wide text-admin-text-muted">SMS</span>
      </div>
      {ROWS.map((r) => (
        <div key={r.category} className="grid grid-cols-[1fr_auto_auto] items-center gap-x-6 border-b border-admin-border px-6 py-4 last:border-0">
          <div className="min-w-0">
            <div className="font-body text-sm font-medium text-admin-text">{r.title}</div>
            <div className="font-body text-[12px] text-admin-text-muted">{r.desc}</div>
          </div>
          {(['email', 'sms'] as Channel[]).map((ch) => (
            <div key={ch} className="flex w-12 justify-center">
              <Toggle on={get(r.category, ch)} onClick={() => toggle(r.category, ch)} />
            </div>
          ))}
        </div>
      ))}
      <div className="flex justify-end px-6 py-4">
        <button
          disabled={busy || !dirty}
          onClick={save}
          className="inline-flex items-center gap-2 rounded-xl bg-admin-navy px-5 py-2.5 font-body text-sm font-medium text-white shadow-admin-sm transition-colors hover:bg-admin-navy-2 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} /> : <Check className="h-4 w-4" strokeWidth={2.5} />}
          {dirty ? 'Save preferences' : 'Saved'}
        </button>
      </div>
    </div>
  );
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onClick}
      className={
        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors ' +
        (on ? 'bg-admin-green' : 'bg-admin-border')
      }
    >
      <span
        className={
          'inline-block h-5 w-5 transform rounded-full bg-white shadow-admin-sm transition-transform ' +
          (on ? 'translate-x-5' : 'translate-x-0.5')
        }
      />
    </button>
  );
}
