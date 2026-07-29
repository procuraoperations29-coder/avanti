import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { getAuthUser } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { StaffRowActions } from '../staff-actions';

const ROLE_LABEL: Record<string, string> = {
  admin_verifier: 'Verification',
  admin_support: 'Support',
  admin_finance: 'Finance',
  admin_compliance: 'Compliance',
  super_admin: 'Super admin',
};

function fmtDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default async function StaffDetailPage({
  params,
}: {
  params: Promise<{ roleId: string }>;
}) {
  const user = await getAuthUser();
  if (!user) redirect('/sign-in');
  if (!user.roles.includes('super_admin')) redirect('/admin');

  const { roleId } = await params;
  const admin = createServiceRoleClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: roleRow } = await (admin as any)
    .from('user_roles')
    .select('id, user_id, role, requires_approval, approver_user_id, revoked_at, suspended, suspended_reason, suspended_until, created_at')
    .eq('id', roleId)
    .maybeSingle();

  if (!roleRow) notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: person } = await (admin as any)
    .from('users')
    .select('id, full_name, email, phone, created_at')
    .eq('id', roleRow.user_id)
    .single();

  let approverName: string | null = null;
  if (roleRow.approver_user_id) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: approver } = await (admin as any)
      .from('users')
      .select('full_name')
      .eq('id', roleRow.approver_user_id)
      .maybeSingle();
    approverName = approver?.full_name ?? null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: allRoles } = await (admin as any)
    .from('user_roles')
    .select('id, role')
    .eq('user_id', roleRow.user_id)
    .is('revoked_at', null);

  return (
    <>
      <Link
        href="/admin/staff"
        className="mb-4 inline-flex items-center gap-1 font-body text-[13px] text-admin-text-muted hover:text-admin-text"
      >
        <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.75} />
        Staff
      </Link>

      <p className="font-body text-[12px] uppercase tracking-wide text-admin-text-muted">
        {ROLE_LABEL[roleRow.role] ?? roleRow.role}
      </p>
      <p className="mt-1 font-body text-2xl font-medium text-admin-text">
        {person?.full_name ?? '—'}
      </p>
      <div className="mt-2 flex flex-wrap gap-4 font-body text-[12px] text-admin-text-muted">
        {person?.email && <span>{person.email}</span>}
        {person?.phone && <span>{person.phone}</span>}
        <span>Joined {fmtDate(person?.created_at ?? null)}</span>
      </div>

      <div className="mt-8 rounded-xl border border-admin-border bg-admin-card p-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <div className="font-body text-[11px] uppercase tracking-wide text-admin-text-muted">Status</div>
            <div className="mt-1.5 font-body text-sm font-medium text-admin-text">
              {roleRow.revoked_at ? 'Deactivated' : roleRow.suspended ? 'Suspended' : 'Active'}
            </div>
            {roleRow.suspended && roleRow.suspended_reason && (
              <div className="mt-1 font-body text-[12px] text-admin-text-muted">
                {roleRow.suspended_reason}
              </div>
            )}
          </div>
          <div>
            <div className="font-body text-[11px] uppercase tracking-wide text-admin-text-muted">Approval</div>
            <div className="mt-1.5 font-body text-sm text-admin-text">
              {roleRow.requires_approval ? `Reviewed by ${approverName ?? '—'}` : 'No approval needed'}
            </div>
          </div>
          <div>
            <div className="font-body text-[11px] uppercase tracking-wide text-admin-text-muted">All roles held</div>
            <div className="mt-1.5 font-body text-sm text-admin-text">
              {(allRoles ?? []).map((r: { role: string }) => ROLE_LABEL[r.role] ?? r.role).join(' · ') || '—'}
            </div>
          </div>
          <div>
            <div className="font-body text-[11px] uppercase tracking-wide text-admin-text-muted">In this role since</div>
            <div className="mt-1.5 font-body text-sm text-admin-text">{fmtDate(roleRow.created_at)}</div>
          </div>
        </div>

        <div className="mt-6 border-t border-admin-border pt-4">
          <StaffRowActions
            roleId={roleRow.id}
            isRevoked={!!roleRow.revoked_at}
            isSuspended={roleRow.suspended}
          />
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-admin-border bg-admin-card px-6 py-5">
        <div className="font-body text-[11px] font-medium uppercase tracking-wide text-admin-text-muted">
          Coming next
        </div>
        <p className="mt-1.5 max-w-2xl font-body text-sm leading-relaxed text-admin-text">
          Once the approvals queue ships, this page will show this person&apos;s recent submitted
          actions and their approval status — everything they&apos;ve done that&apos;s pending, approved,
          or rejected.
        </p>
      </div>
    </>
  );
}
