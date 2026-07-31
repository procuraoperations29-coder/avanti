'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { cn } from '@/lib/utils/cn';

const NEXT_STATUS: Record<string, { label: string; next: string }[]> = {
  new: [
    { label: 'Mark reviewing', next: 'reviewing' },
    { label: 'Decline', next: 'declined' },
  ],
  reviewing: [
    { label: 'Introduce', next: 'introduced' },
    { label: 'Decline', next: 'declined' },
  ],
  introduced: [
    { label: 'Mark matched', next: 'matched' },
    { label: 'Close', next: 'closed' },
  ],
  matched: [
    { label: 'Close', next: 'closed' },
  ],
  closed: [],
  declined: [],
};

export function EnquiryStatusButtons({
  enquiryId,
  currentStatus,
}: {
  enquiryId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const options = NEXT_STATUS[currentStatus] ?? [];

  if (options.length === 0) {
    return (
      <div className="font-body text-[11px] font-medium uppercase tracking-wide text-admin-text-muted">
        Final state · no further actions
      </div>
    );
  }

  const update = async (next: string) => {
    if (!window.confirm(`Move this enquiry to "${next}"?`)) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/admin/placement-enquiries/${enquiryId}/status`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: next }),
        }
      );
      const body = (await res.json()) as { ok?: boolean; error?: string; message?: string };
      if (!res.ok) {
        toast.error(body.message ?? body.error ?? 'Update failed');
        return;
      }
      toast.success(`Marked ${next}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt.next}
          onClick={() => update(opt.next)}
          disabled={busy}
          className={cn(
            'rounded-xl border px-4 py-2 font-body text-sm font-medium shadow-admin-sm transition-all disabled:opacity-50',
            opt.next === 'declined' || opt.next === 'closed'
              ? 'border-admin-border bg-admin-card text-admin-text-muted hover:text-admin-text'
              : 'border-admin-navy bg-admin-navy text-white hover:bg-admin-navy-2'
          )}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} /> : opt.label}
        </button>
      ))}
    </div>
  );
}
