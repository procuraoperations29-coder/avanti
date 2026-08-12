import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getAuthUser } from '@/lib/auth';
import { SectionLabel } from '@/components/avanti/section-label';
import { Logo } from '@/components/brand/logo';
import { SetPasswordForm } from './set-password-form';

const ROLE_HOME: Record<string, string> = {
  driver: '/driver',
  individual_customer: '/customer',
  corporate_admin: '/corporate',
  corporate_member: '/corporate',
  admin_verifier: '/admin',
  admin_support: '/admin',
  admin_finance: '/admin',
  admin_compliance: '/admin',
  super_admin: '/admin',
};

function homeFor(roles: string[], activeRole: string | null): string {
  if (activeRole && ROLE_HOME[activeRole]) return ROLE_HOME[activeRole];
  for (const r of roles) if (ROLE_HOME[r]) return ROLE_HOME[r];
  return '/customer';
}

export default async function SetPasswordPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await getAuthUser();
  const sp = await searchParams;
  if (!user) {
    const next = sp.next ? `?next=${encodeURIComponent(sp.next)}` : '';
    redirect(`/sign-in${next}`);
  }

  const home = homeFor(user.roles, user.activeRole ?? null);
  const dest = sp.next || home;
  const isReset = sp.reset === '1';

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <Link href="/"><Logo /></Link>
        </div>
      </header>

      <main className="mx-auto max-w-md px-6 py-16 md:py-24">
        <SectionLabel>{isReset ? 'Reset your password' : 'Set a password'}</SectionLabel>
        <h1 className="mt-4 font-display text-4xl leading-tight text-ink">
          {isReset ? <>Choose a new <em className="italic">password.</em></> : <>Skip the code <em className="italic">next time.</em></>}
        </h1>
        <p className="mt-4 font-body leading-relaxed text-ink-muted">
          {isReset
            ? 'Pick a new password for your account.'
            : 'Set a password now so you can sign in instantly instead of waiting for an email code each time.'}
        </p>

        <div className="mt-8">
          <SetPasswordForm dest={dest} allowSkip={!isReset} />
        </div>
      </main>
    </div>
  );
}
