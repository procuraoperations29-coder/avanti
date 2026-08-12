'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Check } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

export function SettleButton({ kind, bookingIds, label }: { kind: 'partner' | 'driver'; bookingIds: string[]; label: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const settle = async () => {
    if (bookingIds.length === 0) return;
    const reference = window.prompt('Payment reference (optional) — e.g. bank transfer ref:') ?? '';
    setBusy(true);
    try {
      const res = await fetch('/api/admin/car-hire/settlements', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, bookingIds, reference: reference || null }),
      });
      const b = (await res.json()) as { ok?: boolean; error?: string; message?: string };
      if (!res.ok) return void toast.error(b.message ?? b.error ?? 'Could not mark settled');
      toast.success('Marked settled');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not mark settled');
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={settle}
      disabled={busy || bookingIds.length === 0}
      className="inline-flex items-center gap-1.5 rounded-lg bg-admin-navy px-3 py-1.5 font-body text-[12px] font-medium text-white shadow-admin-sm transition-colors hover:bg-admin-navy-2 disabled:opacity-50"
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" strokeWidth={2} />} {label}
    </button>
  );
}
