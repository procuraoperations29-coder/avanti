import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import { OnboardingWizard } from '@/components/driver/onboarding/wizard';

export default async function DriverOnboardingPage() {
  const user = await getAuthUser();
  if (!user) redirect('/sign-in');
  if (!user.roles.includes('driver')) redirect('/sign-in');

  return <OnboardingWizard />;
}
