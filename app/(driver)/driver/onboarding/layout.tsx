import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getAuthUser } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { Logo } from '@/components/brand/logo';

/**
 * Wizard shell — provides consistent header (Avanti wordmark + sign-out)
 * and enforces auth. If the driver_profile is already approved, sends
 * them to /driver instead. If it's submitted-and-pending, sends them to
 * /driver/onboarding/step-pending.
 */

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthUser();
  if (!user) redirect('/sign-in');
  if (!user.roles.includes('driver')) redirect('/sign-in');

  const admin = createServiceRoleClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (admin as any)
    .from('driver_profiles')
    .select('verification_status, onboarding_submitted_at')
    .eq('user_id', user.id)
    .single();

  // If already approved, they don't need onboarding
  if (profile?.verification_status === 'approved') {
    redirect('/driver');
  }

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <Link href="/">
            <Logo size="sm" />
          </Link>
          <span className="font-mono text-xs uppercase tracking-wider text-ink-muted">
            Driver onboarding
          </span>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
