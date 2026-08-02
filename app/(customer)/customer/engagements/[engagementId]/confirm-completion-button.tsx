'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Check } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

export function ConfirmCompletionButton({ engagementId }: { engagementId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/customer/engagements/${engagementId}/confirm`, { method: 'POST' });
      const body = (await res.json()) as { ok?: boolean; error?: string; message?: string };
      if (!res.ok) {
        toast.error(body.message ?? body.error ?? 'Could not confirm');
        return;
      }
      toast.success('Thanks — completion confirmed');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not confirm');
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={confirm}
      disabled={busy}
      className="mt-3 inline-flex items-center gap-2 rounded-xl bg-admin-green px-4 py-2.5 font-body text-sm font-medium text-admin-navy-2 shadow-admin-sm transition-all hover:brightness-95 disabled:opacity-60"
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} /> : <Check className="h-4 w-4" strokeWidth={2.5} />}
      Confirm it&apos;s done
    </button>
  );
}
