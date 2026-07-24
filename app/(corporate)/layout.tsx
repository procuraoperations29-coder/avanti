import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import { PageShell } from '@/components/shell/page-shell';

export default async function CorporateLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthUser();
  if (!user) redirect('/sign-in');
  if (!user.roles.includes('corporate_admin') && !user.roles.includes('corporate_member')) {
    redirect('/sign-in');
  }

  return <PageShell>{children}</PageShell>;
}
