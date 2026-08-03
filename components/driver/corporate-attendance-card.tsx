'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, LogIn, LogOut, Check, Clock } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

/**
 * Driver's daily corporate sign-in / sign-out for one assignment, plus a
 * manual overtime log. Editorial styling to match the driver app.
 */
export function CorporateAttendanceCard({
  assignmentId,
  orgName,
  position,
  signInAt,
  signOutAt,
}: {
  assignmentId: string;
  orgName: string;
  position: string | null;
  signInAt: string | null;
  signOutAt: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [otOpen, setOtOpen] = useState(false);
  const [otHours, setOtHours] = useState('');
  const [otNote, setOtNote] = useState('');

  const fmtTime = (s: string | null) =>
    s ? new Date(s).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—';

  async function mark(action: 'sign_in' | 'sign_out') {
    setBusy(true);
    try {
      const res = await fetch('/api/driver/corporate/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentId, action }),
      });
      const body = (await res.json()) as { ok?: boolean; error?: string; message?: string };
      if (!res.ok) {
        toast.error(body.message ?? body.error ?? 'Could not update');
        return;
      }
      toast.success(action === 'sign_in' ? 'Signed in' : 'Signed out — have a good day');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update');
    } finally {
      setBusy(false);
    }
  }

  async function logOvertime() {
    const h = Number(otHours);
    if (!h || h <= 0) return toast.error('Enter overtime hours.');
    setBusy(true);
    try {
      const res = await fetch('/api/driver/corporate/overtime', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignmentId,
          workDate: new Date().toISOString().slice(0, 10),
          hours: h,
          note: otNote.trim() || null,
        }),
      });
      const body = (await res.json()) as { ok?: boolean; error?: string; message?: string };
      if (!res.ok) {
        toast.error(body.message ?? body.error ?? 'Could not log overtime');
        return;
      }
      toast.success('Overtime logged — awaiting approval');
      setOtOpen(false);
      setOtHours('');
      setOtNote('');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not log overtime');
    } finally {
      setBusy(false);
    }
  }

  const present = Boolean(signInAt && signOutAt);
  const signedIn = Boolean(signInAt && !signOutAt);

  return (
    <div className="border border-line bg-paper-2 p-5">
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate font-display text-lg leading-tight text-ink">{orgName}</div>
          {position && (
            <div className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">{position}</div>
          )}
        </div>
        {present ? (
          <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-green">
            <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> Done today
          </span>
        ) : signedIn ? (
          <span className="font-mono text-[10px] uppercase tracking-wider text-brass">On shift</span>
        ) : (
          <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">Not signed in</span>
        )}
      </div>

      <div className="mt-3 flex items-center gap-4 font-mono text-xs text-ink-muted">
        <span>In: {fmtTime(signInAt)}</span>
        <span>Out: {fmtTime(signOutAt)}</span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {!signInAt && (
          <button
            onClick={() => mark('sign_in')}
            disabled={busy}
            className="inline-flex items-center gap-2 border border-ink bg-ink px-4 py-2 font-body text-sm text-paper transition-colors hover:bg-ink-2 disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" strokeWidth={1.75} />}
            Sign in
          </button>
        )}
        {signedIn && (
          <button
            onClick={() => mark('sign_out')}
            disabled={busy}
            className="inline-flex items-center gap-2 border border-ink bg-ink px-4 py-2 font-body text-sm text-paper transition-colors hover:bg-ink-2 disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" strokeWidth={1.75} />}
            Sign out
          </button>
        )}
        <button
          onClick={() => setOtOpen((v) => !v)}
          className="inline-flex items-center gap-2 border border-line-strong bg-paper px-4 py-2 font-body text-sm text-ink transition-colors hover:bg-paper-3"
        >
          <Clock className="h-4 w-4" strokeWidth={1.75} />
          Log overtime
        </button>
      </div>

      {otOpen && (
        <div className="mt-4 border-t border-line pt-4">
          <div className="flex flex-wrap items-end gap-3">
            <label className="block">
              <span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-ink-muted">Hours</span>
              <input
                type="number"
                min={0}
                step={0.5}
                value={otHours}
                onChange={(e) => setOtHours(e.target.value)}
                className="w-24 border border-line-strong bg-paper px-3 py-2 font-body text-sm text-ink focus:border-ink focus:outline-none"
                placeholder="2"
              />
            </label>
            <label className="block flex-1">
              <span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-ink-muted">Note (optional)</span>
              <input
                value={otNote}
                onChange={(e) => setOtNote(e.target.value)}
                className="w-full border border-line-strong bg-paper px-3 py-2 font-body text-sm text-ink focus:border-ink focus:outline-none"
                placeholder="Late airport run"
              />
            </label>
            <button
              onClick={logOvertime}
              disabled={busy}
              className="inline-flex items-center gap-2 border border-ink bg-ink px-4 py-2 font-body text-sm text-paper transition-colors hover:bg-ink-2 disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Submit
            </button>
          </div>
          <p className="mt-2 font-mono text-[10px] text-ink-muted">
            Your company approves overtime before it&apos;s paid.
          </p>
        </div>
      )}
    </div>
  );
}
