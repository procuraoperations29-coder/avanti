import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { AdminPageHeader, MiniStat, AdminSectionLabel } from '@/components/avanti/admin/page-header';
import { pushConfigured } from '@/lib/push/send';
import { BroadcastForm } from './broadcast-form';

export const dynamic = 'force-dynamic';

export default async function NotificationsPage() {
  const user = await getAuthUser();
  if (!user) redirect('/sign-in');
  if (!user.roles.includes('admin_support') && !user.roles.includes('super_admin')) redirect('/admin');

  const admin = createServiceRoleClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const A = admin as any;

  let subscribers = 0;
  let devices = 0;
  let tableMissing = false;
  try {
    const { data, error } = await A.from('push_subscriptions').select('user_id').is('revoked_at', null);
    if (error) tableMissing = true;
    else {
      devices = (data ?? []).length;
      subscribers = new Set((data ?? []).map((r: { user_id: string }) => r.user_id)).size;
    }
  } catch { tableMissing = true; }

  const configured = pushConfigured();

  return (
    <>
      <AdminPageHeader backHref="/admin" backLabel="Admin" title="Push notifications" subtitle="Broadcast an announcement to installed-app users" />

      {!configured && (
        <div className="mb-5 rounded-2xl border border-admin-amber-soft bg-admin-amber-soft/40 px-6 py-4 font-body text-sm text-admin-amber-text shadow-admin-sm">
          Push isn&apos;t configured yet — add the <b>VAPID</b> keys to the environment (NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT). Sends will be skipped until then.
        </div>
      )}
      {tableMissing && (
        <div className="mb-5 rounded-2xl border border-admin-amber-soft bg-admin-amber-soft/40 px-6 py-4 font-body text-sm text-admin-amber-text shadow-admin-sm">
          Apply migration <b>20260901000000_push_subscriptions.sql</b> to enable subscriptions.
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MiniStat label="Subscribers" value={subscribers} />
        <MiniStat label="Devices" value={devices} />
      </div>

      <AdminSectionLabel>Compose</AdminSectionLabel>
      <div className="mt-2">
        <BroadcastForm />
      </div>

      <p className="mt-4 font-body text-[12px] leading-relaxed text-admin-text-muted">
        Notifications reach users who installed the app and enabled notifications (Settings → Notifications). Send a test to yourself first. Keep the title short — phones truncate long titles.
      </p>
    </>
  );
}
