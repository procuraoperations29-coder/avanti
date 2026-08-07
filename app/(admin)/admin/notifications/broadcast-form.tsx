'use client';

import { useState } from 'react';
import { Loader2, Send, Bell } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

const IN = 'w-full rounded-xl border border-admin-border bg-admin-bg px-3 py-2 font-body text-sm text-admin-text outline-none focus:border-admin-green focus:ring-2 focus:ring-admin-green/20';

export function BroadcastForm() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState('');

  async function send(target: 'all' | 'test') {
    if (!title.trim() || !body.trim()) return toast.error('Title and message are required.');
    if (target === 'all' && !window.confirm('Send this to ALL subscribers?')) return;
    setBusy(target);
    try {
      const res = await fetch('/api/admin/push/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), body: body.trim(), url: url.trim() || undefined, target }),
      });
      const b = (await res.json()) as { ok?: boolean; sent?: number; failed?: number; skipped?: number; error?: string; message?: string };
      if (!res.ok) return void toast.error(b.message ?? b.error ?? 'Send failed');
      if ((b.skipped ?? 0) > 0 && (b.sent ?? 0) === 0) toast.error('Push isn’t configured (VAPID keys missing).');
      else toast.success(target === 'test' ? `Test sent (${b.sent ?? 0})` : `Sent to ${b.sent ?? 0}${b.failed ? `, ${b.failed} failed` : ''}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Send failed');
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="rounded-2xl border border-admin-border bg-admin-card p-5 shadow-admin-sm">
      <div className="grid gap-3">
        <label><span className="mb-1 block font-body text-[11px] uppercase tracking-wide text-admin-text-muted">Title</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder="Avanti" className={IN} /></label>
        <label><span className="mb-1 block font-body text-[11px] uppercase tracking-wide text-admin-text-muted">Message</span>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={300} rows={3} placeholder="What do you want to tell your users?" className={IN} /></label>
        <label><span className="mb-1 block font-body text-[11px] uppercase tracking-wide text-admin-text-muted">Link (optional)</span>
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="/customer/search" className={IN} /></label>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button onClick={() => send('test')} disabled={busy !== ''} className="inline-flex items-center gap-2 rounded-xl border border-admin-border px-4 py-2 font-body text-sm font-medium text-admin-text hover:bg-admin-bg disabled:opacity-50">
          {busy === 'test' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" strokeWidth={1.75} />} Send test to me
        </button>
        <button onClick={() => send('all')} disabled={busy !== ''} className="inline-flex items-center gap-2 rounded-xl bg-admin-green px-4 py-2 font-body text-sm font-semibold text-white disabled:opacity-50">
          {busy === 'all' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" strokeWidth={2} />} Send to all subscribers
        </button>
      </div>
    </div>
  );
}
