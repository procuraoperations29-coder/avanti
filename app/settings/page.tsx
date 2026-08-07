import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { PageShell } from '@/components/shell/page-shell';
import { AdminPageHeader, AdminSectionLabel } from '@/components/avanti/admin/page-header';
import { ProfileForm } from '@/components/account/profile-form';
import { NotificationPrefs } from '@/components/account/notification-prefs';
import { PushToggle } from '@/components/pwa/push-toggle';
import { SignOutButton } from '@/components/account/sign-out-button';

export const dynamic = 'force-dynamic';

const ROLE_LABEL: Record<string, string> = {
  individual_customer: 'Customer',
  driver: 'Driver',
  corporate_admin: 'Corporate admin',
  corporate_member: 'Corporate member',
  admin_verifier: 'Verifier',
  admin_support: 'Support',
  admin_finance: 'Finance',
  admin_compliance: 'Compliance',
  super_admin: 'Super admin',
};

const ROLE_LANDING: Record<string, { href: string; label: string }> = {
  individual_customer: { href: '/customer', label: 'Home' },
  driver: { href: '/driver', label: 'Driver' },
  corporate_admin: { href: '/corporate', label: 'Corporate' },
  corporate_member: { href: '/corporate', label: 'Corporate' },
  admin_verifier: { href: '/admin', label: 'Admin' },
  admin_support: { href: '/admin', label: 'Admin' },
  admin_finance: { href: '/admin', label: 'Admin' },
  admin_compliance: { href: '/admin', label: 'Admin' },
  super_admin: { href: '/admin', label: 'Admin' },
};

function fmtDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-admin-border px-6 py-3.5 last:border-0">
      <span className="font-body text-[13px] text-admin-text-muted">{label}</span>
      <span className="truncate text-right font-body text-sm font-medium text-admin-text">{value}</span>
    </div>
  );
}

export default async function SettingsPage() {
  const user = await getAuthUser();
  if (!user) redirect('/sign-in');

  const admin = createServiceRoleClient();

  // Profile
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (admin as any)
    .from('users')
    .select('full_name, display_name, email, phone, preferred_language, preferred_currency, created_at, status')
    .eq('id', user.id)
    .single();

  // Notification preferences → { "category:channel": enabled }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: prefRows } = await (admin as any)
    .from('notification_preferences')
    .select('category, channel, enabled')
    .eq('user_id', user.id);
  const prefs: Record<string, boolean> = {};
  for (const r of prefRows ?? []) prefs[`${r.category}:${r.channel}`] = r.enabled;

  const role = user.activeRole ?? user.roles[0] ?? null;
  const back = (role && ROLE_LANDING[role]) || { href: '/', label: 'Home' };

  // Role-specific: driver payout method / corporate org
  let driverPayout: { bank: string | null; last4: string | null; holder: string | null; kyc: string } | null = null;
  let org: { name: string; billing_email: string; status: string } | null = null;

  if (user.roles.includes('driver')) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: dp } = await (admin as any)
      .from('driver_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();
    if (dp) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: pm } = await (admin as any)
        .from('driver_payout_methods')
        .select('bank_code, account_number_last4, account_holder_name, kyc_status, is_default')
        .eq('driver_id', dp.id)
        .is('deleted_at', null)
        .order('is_default', { ascending: false })
        .limit(1)
        .maybeSingle();
      driverPayout = pm
        ? { bank: pm.bank_code, last4: pm.account_number_last4, holder: pm.account_holder_name, kyc: pm.kyc_status }
        : { bank: null, last4: null, holder: null, kyc: 'none' };
    }
  }

  if (user.activeOrganizationId && (user.roles.includes('corporate_admin') || user.roles.includes('corporate_member'))) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: o } = await (admin as any)
      .from('organizations')
      .select('name, billing_email, status')
      .eq('id', user.activeOrganizationId)
      .single();
    if (o) org = o;
  }

  return (
    <PageShell maxWidth="md">
      <AdminPageHeader backHref={back.href} backLabel={back.label} title="Settings" subtitle="Your profile, notifications, and account" />

      {/* Profile */}
      <div className="mb-10">
        <AdminSectionLabel>Profile</AdminSectionLabel>
        <ProfileForm
          fullName={profile?.full_name ?? ''}
          displayName={profile?.display_name ?? null}
          preferredLanguage={profile?.preferred_language ?? null}
          preferredCurrency={profile?.preferred_currency ?? null}
        />
      </div>

      {/* Notifications */}
      <div className="mb-10">
        <AdminSectionLabel>Notifications</AdminSectionLabel>
        <div className="mb-3"><PushToggle /></div>
        <NotificationPrefs initial={prefs} />
      </div>

      {/* Driver payout */}
      {driverPayout && (
        <div className="mb-10">
          <AdminSectionLabel>Payout method</AdminSectionLabel>
          <div className="overflow-hidden rounded-2xl border border-admin-border bg-admin-card shadow-admin-sm">
            {driverPayout.last4 ? (
              <>
                <InfoRow label="Account holder" value={driverPayout.holder ?? '—'} />
                <InfoRow label="Bank" value={driverPayout.bank ?? '—'} />
                <InfoRow label="Account" value={`•••• ${driverPayout.last4}`} />
                <InfoRow label="Verification" value={driverPayout.kyc} />
              </>
            ) : (
              <div className="px-6 py-6 font-body text-sm text-admin-text-muted">
                No payout method on file yet. Add one so Avanti can pay you — contact support to set up your bank account securely.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Corporate org */}
      {org && (
        <div className="mb-10">
          <AdminSectionLabel>Organisation</AdminSectionLabel>
          <div className="overflow-hidden rounded-2xl border border-admin-border bg-admin-card shadow-admin-sm">
            <InfoRow label="Name" value={org.name} />
            <InfoRow label="Billing email" value={org.billing_email} />
            <InfoRow label="Status" value={org.status.replace(/_/g, ' ')} />
          </div>
        </div>
      )}

      {/* Account */}
      <div>
        <AdminSectionLabel>Account</AdminSectionLabel>
        <div className="mb-4 overflow-hidden rounded-2xl border border-admin-border bg-admin-card shadow-admin-sm">
          <InfoRow label="Phone" value={profile?.phone ?? user.phone ?? '—'} />
          <InfoRow label="Email" value={profile?.email ?? user.email ?? '—'} />
          <InfoRow label="Role" value={role ? ROLE_LABEL[role] ?? role : '—'} />
          <InfoRow label="Member since" value={fmtDate(profile?.created_at ?? null)} />
        </div>
        <p className="mb-4 font-body text-[12px] text-admin-text-muted">
          Your phone and email are your sign-in credentials — to change them, contact support so we can verify the change.
        </p>
        <SignOutButton />
      </div>
    </PageShell>
  );
}
