'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

const ROLE_OPTIONS = [
  { value: 'admin_verifier', label: 'Verification' },
  { value: 'admin_support', label: 'Support' },
  { value: 'admin_finance', label: 'Finance' },
  { value: 'admin_compliance', label: 'Compliance' },
  { value: 'super_admin', label: 'Super admin' },
] as const;

interface Approver {
  id: string;
  full_name: string;
}

export function CreateStaffPanel({ approvers }: { approvers: Approver[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<(typeof ROLE_OPTIONS)[number]['value']>('admin_verifier');
  const [requiresApproval, setRequiresApproval] = useState(true);
  const [approverUserId, setApproverUserId] = useState(approvers[0]?.id ?? '');

  const submit = async () => {
    if (!fullName.trim() || !email.trim()) {
      toast.error('Name and email are required');
      return;
    }
    if (requiresApproval && !approverUserId) {
      toast.error('Choose an approver, or turn off approval for this person');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/admin/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim(),
          role,
          requiresApproval,
          approverUserId: requiresApproval ? approverUserId : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message ?? data.error ?? 'Could not create staff member');
        return;
      }
      toast.success(data.emailed ? `${fullName} added — invite sent to ${email}` : `${fullName} added (invite email failed — send them the sign-in link manually)`);
      setFullName('');
      setEmail('');
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create staff member');
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl bg-admin-navy px-4 py-2.5 font-body text-sm font-medium text-white shadow-admin-sm transition-colors hover:bg-admin-navy-2"
      >
        <Plus className="h-4 w-4" strokeWidth={2} />
        Add staff
      </button>
    );
  }

  return (
    <div className="mb-6 rounded-2xl border border-admin-border bg-admin-card p-5 shadow-admin">
      <p className="mb-4 font-display text-[15px] font-semibold text-admin-text">New staff member</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block font-body text-[12px] text-admin-text-muted">Full name</label>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded-xl border border-admin-border bg-admin-bg px-3 py-2 font-body text-sm text-admin-text outline-none focus:border-admin-green focus:ring-2 focus:ring-admin-green/20"
          />
        </div>
        <div>
          <label className="mb-1 block font-body text-[12px] text-admin-text-muted">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-admin-border bg-admin-bg px-3 py-2 font-body text-sm text-admin-text outline-none focus:border-admin-green focus:ring-2 focus:ring-admin-green/20"
          />
        </div>
        <div>
          <label className="mb-1 block font-body text-[12px] text-admin-text-muted">Department</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as typeof role)}
            className="w-full rounded-xl border border-admin-border bg-admin-bg px-3 py-2 font-body text-sm text-admin-text outline-none focus:border-admin-green focus:ring-2 focus:ring-admin-green/20"
          >
            {ROLE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block font-body text-[12px] text-admin-text-muted">Approver</label>
          <select
            value={approverUserId}
            disabled={!requiresApproval}
            onChange={(e) => setApproverUserId(e.target.value)}
            className="w-full rounded-xl border border-admin-border bg-admin-bg px-3 py-2 font-body text-sm text-admin-text outline-none focus:border-admin-green focus:ring-2 focus:ring-admin-green/20 disabled:opacity-50"
          >
            {approvers.length === 0 && <option value="">No admins yet</option>}
            {approvers.map((a) => (
              <option key={a.id} value={a.id}>
                {a.full_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <label className="mt-4 flex items-center gap-2 font-body text-[13px] text-admin-text">
        <input
          type="checkbox"
          checked={requiresApproval}
          onChange={(e) => setRequiresApproval(e.target.checked)}
          className="h-4 w-4 accent-admin-green"
        />
        Their work needs approval before it takes effect
      </label>

      <div className="mt-5 flex gap-2">
        <button
          onClick={submit}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-xl bg-admin-green px-4 py-2 font-body text-sm font-medium text-admin-navy-2 shadow-admin-sm transition-colors hover:brightness-95 disabled:opacity-60"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          Create
        </button>
        <button
          onClick={() => setOpen(false)}
          disabled={busy}
          className="rounded-lg px-4 py-2 font-body text-sm text-admin-text-muted hover:text-admin-text"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export function StaffRowActions({
  roleId,
  isRevoked,
  isSuspended,
}: {
  roleId: string;
  isRevoked: boolean;
  isSuspended: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const act = async (action: string, extra?: Record<string, unknown>) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/staff/${roleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message ?? data.error ?? 'Action failed');
        return;
      }
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center justify-end gap-3 font-body text-[12px]">
      {isRevoked ? (
        <button
          disabled={busy}
          onClick={() => act('activate')}
          className="font-medium text-admin-green-text hover:underline disabled:opacity-50"
        >
          Activate
        </button>
      ) : (
        <button
          disabled={busy}
          onClick={() => act('deactivate')}
          className="text-admin-text-muted hover:text-admin-text disabled:opacity-50"
        >
          Deactivate
        </button>
      )}
      {isSuspended ? (
        <button
          disabled={busy}
          onClick={() => act('unsuspend')}
          className="font-medium text-admin-green-text hover:underline disabled:opacity-50"
        >
          Unsuspend
        </button>
      ) : (
        <button
          disabled={busy}
          onClick={() => {
            const reason = window.prompt('Reason for suspension (optional):') ?? '';
            act('suspend', { reason });
          }}
          className="text-admin-amber-text hover:underline disabled:opacity-50"
        >
          Suspend
        </button>
      )}
    </div>
  );
}
