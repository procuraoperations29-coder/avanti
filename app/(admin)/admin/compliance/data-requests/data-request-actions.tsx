'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Play, Check, X, Download } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

export function DataRequestActions({ id, status, requestType }: { id: string; status: string; requestType: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState('');

  async function act(action: string, tag: string, okMsg: string, withNote = false) {
    const note = withNote ? (window.prompt('Note (optional):') ?? '') : undefined;
    setBusy(tag);
    try {
      const res = await fetch(`/api/admin/data-requests/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, note }) });
      const b = (await res.json()) as { ok?: boolean; error?: string; message?: string; erased?: boolean };
      if (!res.ok) return void toast.error(b.message ?? b.error ?? 'Action failed');
      toast.success(b.erased ? 'Completed — subject erased' : okMsg);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setBusy('');
    }
  }

  const done = status === 'completed' || status === 'rejected';
  const isAccess = /access|portab/i.test(requestType);
  const isErasure = /eras|delet/i.test(requestType);

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {isAccess && (
        <a href={`/api/admin/data-requests/${id}/export`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-admin-border px-3 py-1.5 font-body text-[12px] font-medium text-admin-text hover:bg-admin-bg">
          <Download className="h-3.5 w-3.5" strokeWidth={2} /> Export data
        </a>
      )}
      {!done && status !== 'in_progress' && (
        <button onClick={() => act('start', 'start', 'Marked in progress')} disabled={busy !== ''} className="inline-flex items-center gap-1.5 rounded-lg border border-admin-border px-3 py-1.5 font-body text-[12px] font-medium text-admin-text hover:bg-admin-bg disabled:opacity-50">
          {busy === 'start' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" strokeWidth={2} />} Start
        </button>
      )}
      {!done && (
        <button onClick={() => act('complete', 'complete', 'Completed', true)} disabled={busy !== ''} className="inline-flex items-center gap-1.5 rounded-lg bg-admin-green px-3 py-1.5 font-body text-[12px] font-semibold text-white disabled:opacity-50" title={isErasure ? 'Completing an erasure request soft-deletes the subject' : undefined}>
          {busy === 'complete' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" strokeWidth={2.5} />} {isErasure ? 'Complete & erase' : 'Complete'}
        </button>
      )}
      {!done && (
        <button onClick={() => act('reject', 'reject', 'Rejected', true)} disabled={busy !== ''} className="inline-flex items-center gap-1.5 rounded-lg border border-admin-border px-3 py-1.5 font-body text-[12px] font-medium text-red-600 hover:bg-red-500/10 disabled:opacity-50">
          {busy === 'reject' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" strokeWidth={2} />} Reject
        </button>
      )}
    </div>
  );
}
