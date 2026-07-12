import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, Clock, User } from 'lucide-react';
import { getAuthUser, hasPermission } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { SectionLabel } from '@/components/avanti/section-label';
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
    <div className="mx-auto max-w-5xl px-4 pt-8 sm:px-6">
      <div className="mb-6">
        <Link
          href="/admin"
          className="font-mono text-xs uppercase tracking-wider text-ink-muted hover:text-ink"
        >
          ← Admin
        </Link>
        <SectionLabel className="mt-4">Verification queue</SectionLabel>
        <h1 className="mt-2 font-display text-3xl leading-tight text-ink">
          {items?.length ?? 0} pending
        </h1>
      </div>

      {!items || items.length === 0 ? (
        <EmptyState
          Icon={Clock}
          title="Queue is clear"
          description="No drivers are waiting for verification right now."
        />
      ) : (
        <ul className="border border-line bg-paper-2">
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
                  className="flex items-center gap-4 p-4 transition-colors hover:bg-paper-3"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-line-strong bg-paper">
                    <User className="h-4 w-4 text-ink-muted" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-body text-sm text-ink">{item.full_name}</div>
                    <div className="font-mono text-xs text-ink-muted">
                      {item.phone} · {item.country_code}
                    </div>
                  </div>
                  <div className="hidden sm:block text-right">
                    <div className="font-mono text-xs uppercase tracking-wider text-ink-muted">
                      {item.verification_status.replace(/_/g, ' ')}
                    </div>
                    <div className="mt-0.5 font-mono text-[10px] text-ink-faint">
                      {item.active_document_count} documents
                    </div>
                  </div>
                  <div className="hidden sm:block text-right min-w-[8rem]">
                    <div className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">
                      Submitted
                    </div>
                    <div className="mt-0.5 font-mono text-xs text-ink">{waitingSince}</div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-ink-muted" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
