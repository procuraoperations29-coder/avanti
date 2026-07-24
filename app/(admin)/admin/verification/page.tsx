import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, Clock, User } from 'lucide-react';
import { getAuthUser, hasPermission } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { EmptyState } from '@/components/avanti/empty-state';

/**
 * Verification queue. Reads from v_verification_queue view (Slice 2).
 */

export default async function VerificationQueuePage() {
  const user = await getAuthUser();
  if (!user) redirect('/sign-in');
  if (!hasPermission(user.roles, 'verification.queue.read')) {
    redirect('/admin');
  }

  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: items } = await (supabase as any)
    .from('v_verification_queue')
    .select('*')
    .order('submitted_at', { ascending: true, nullsFirst: false });

  return (
    <>
      <Link
            href="/admin"
            className="mb-4 inline-block font-body text-[13px] text-ink-muted hover:text-ink"
          >
            ← Admin
          </Link>
          <p className="font-body text-lg font-medium text-ink">
            Verification queue
          </p>
          <p className="mt-0.5 mb-6 font-body text-[13px] text-ink-muted">
            {items?.length ?? 0} driver{(items?.length ?? 0) === 1 ? '' : 's'} pending
          </p>

          {!items || items.length === 0 ? (
            <div className="rounded-xl border border-line bg-paper-2">
              <EmptyState
                Icon={Clock}
                title="Queue is clear"
                description="No drivers are waiting for verification right now."
              />
            </div>
          ) : (
            <ul className="overflow-hidden rounded-xl border border-line bg-paper-2">
              {items.map((item: {
                driver_id: string;
                full_name: string;
                phone: string;
                country_code: string;
                verification_status: string;
                submitted_at: string | null;
                active_document_count: number;
              }) => {
                const waitingSince = item.submitted_at
                  ? new Date(item.submitted_at).toLocaleString()
                  : '—';
                return (
                  <li key={item.driver_id} className="border-b border-line last:border-b-0">
                    <Link
                      href={`/admin/verification/${item.driver_id}`}
                      className="flex items-center gap-4 p-4 transition-colors hover:bg-paper"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-paper">
                        <User className="h-4 w-4 text-ink-muted" strokeWidth={1.75} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-body text-sm text-ink">{item.full_name}</div>
                        <div className="font-body text-[12px] text-ink-muted">
                          {item.phone} · {item.country_code}
                        </div>
                      </div>
                      <div className="hidden text-right sm:block">
                        <div className="font-body text-[12px] font-medium capitalize text-ink">
                          {item.verification_status.replace(/_/g, ' ')}
                        </div>
                        <div className="mt-0.5 font-body text-[11px] text-ink-muted">
                          {item.active_document_count} documents
                        </div>
                      </div>
                      <div className="hidden min-w-[8rem] text-right sm:block">
                        <div className="font-body text-[11px] text-ink-muted">Submitted</div>
                        <div className="mt-0.5 font-body text-[12px] text-ink">{waitingSince}</div>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-ink-muted" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
    </>
  );
}
