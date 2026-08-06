'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, X, Plus, Ban, RotateCcw, Trash2 } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

const ROLE_LABEL: Record<string, string> = {
  individual_customer: 'Customer',
  driver: 'Driver',
  corporate_admin: 'Corp admin',
  corporate_member: 'Corp member',
  admin_verifier: 'Verifier',
  admin_support: 'Support',
  admin_finance: 'Finance',
  admin_compliance: 'Compliance',
  super_admin: 'Super admin',
};
const GRANTABLE = ['individual_customer', 'driver', 'admin_verifier', 'admin_support', 'admin_finance', 'admin_compliance', 'super_admin'];

export function UserActions({
  userId,
  status,
  roles,
  canSuper,
  isSelf,
}: {
  userId: string;
  status: string;
  roles: string[];
  canSuper: boolean;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [grant, setGrant] = useState('');

  async function act(action: string, extra: Record<string, unknown>, okMsg: string, confirmMsg?: string) {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    setBusy(action + (extra.role ?? ''));
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      });
      const b = (await res.json()) as { ok?: boolean; error?: string; message?: string };
      if (!res.ok) {
        toast.error(b.message ?? b.error ?? 'Action failed');
        return;
      }
      toast.success(okMsg);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setBusy(null);
    }
  }

  const suspended = status === 'suspended' || status === 'deleted';
  const available = GRANTABLE.filter((r) => !roles.includes(r));

  return (
    <div className="flex flex-col gap-2.5">
      {/* Roles */}
      <div className="flex flex-wrap items-center gap-1.5">
        {roles.length === 0 && <span className="font-body text-[12px] text-admin-text-muted">No roles</span>}
        {roles.map((r) => (
          <span key={r} className="inline-flex items-center gap-1 rounded-full bg-admin-bg px-2 py-0.5 font-body text-[11px] font-medium text-admin-text">
            {ROLE_LABEL[r] ?? r}
            {canSuper && (
              <button
                onClick={() => act('revoke_role', { role: r }, `${ROLE_LABEL[r] ?? r} revoked`, `Revoke ${ROLE_LABEL[r] ?? r}?`)}
                disabled={busy !== null}
                className="text-admin-text-muted hover:text-red-600 disabled:opacity-50"
                aria-label={`Revoke ${r}`}
              >
                {busy === 'revoke_role' + r ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" strokeWidth={2.5} />}
              </button>
            )}
          </span>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        {canSuper && available.length > 0 && (
          <div className="flex items-center gap-1">
            <select
              value={grant}
              onChange={(e) => setGrant(e.target.value)}
              className="rounded-lg border border-admin-border bg-admin-bg px-2 py-1 font-body text-[12px] text-admin-text outline-none focus:border-admin-green"
            >
              <option value="">＋ role…</option>
              {available.map((r) => (
                <option key={r} value={r}>{ROLE_LABEL[r] ?? r}</option>
              ))}
            </select>
            <button
              onClick={() => grant && act('grant_role', { role: grant }, `${ROLE_LABEL[grant] ?? grant} granted`).then(() => setGrant(''))}
              disabled={!grant || busy !== null}
              className="inline-flex items-center gap-1 rounded-lg border border-admin-border px-2 py-1 font-body text-[12px] font-medium text-admin-text hover:bg-admin-bg disabled:opacity-40"
            >
              {busy === 'grant_role' + grant ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" strokeWidth={2.5} />} Grant
            </button>
          </div>
        )}

        {!isSelf && status !== 'deleted' && (
          suspended ? (
            <button
              onClick={() => act('unsuspend', {}, 'Reinstated')}
              disabled={busy !== null}
              className="inline-flex items-center gap-1 rounded-lg border border-admin-border px-2.5 py-1 font-body text-[12px] font-medium text-admin-green-text hover:bg-admin-bg disabled:opacity-50"
            >
              {busy === 'unsuspend' ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" strokeWidth={2} />} Unsuspend
            </button>
          ) : (
            <button
              onClick={() => act('suspend', { reason: window.prompt('Reason (optional):') ?? '' }, 'Suspended')}
              disabled={busy !== null}
              className="inline-flex items-center gap-1 rounded-lg border border-admin-border px-2.5 py-1 font-body text-[12px] font-medium text-admin-amber-text hover:bg-admin-bg disabled:opacity-50"
            >
              {busy === 'suspend' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Ban className="h-3 w-3" strokeWidth={2} />} Suspend
            </button>
          )
        )}

        {canSuper && !isSelf && status !== 'deleted' && (
          <button
            onClick={() => act('soft_delete', {}, 'User deleted', 'Delete this user? This revokes their roles and access. History is retained (soft delete).')}
            disabled={busy !== null}
            className="inline-flex items-center gap-1 rounded-lg border border-admin-border px-2.5 py-1 font-body text-[12px] font-medium text-red-600 hover:bg-red-500/10 disabled:opacity-50"
          >
            {busy === 'soft_delete' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" strokeWidth={2} />} Delete
          </button>
        )}
      </div>
    </div>
  );
}
