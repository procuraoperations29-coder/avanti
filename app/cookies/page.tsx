import type { Metadata } from 'next';
import { LegalPage } from '@/components/marketing/legal-page';
import { COMPANY } from '@/config/company';

export const metadata: Metadata = { title: 'Cookie Policy · Avanti' };
const UPDATED = '16 August 2026';

export default function CookiesPage() {
  return (
    <LegalPage
      title="Cookie Policy"
      updated={UPDATED}
      intro={`This Policy explains how ${COMPANY.legalName} ("Avanti") uses cookies and similar technologies on our platform.`}
      sections={[
        { heading: 'What cookies are', paragraphs: [
          'Cookies are small text files stored on your device when you visit a website or app. Similar technologies include local storage and device identifiers. They help a service work and remember your preferences.',
        ] },
        { heading: 'How we use them', paragraphs: ['We use a small number of cookies and similar technologies to:'], bullets: [
          'Keep you signed in and secure your session (essential).',
          'Remember preferences such as your interface settings.',
          'Understand basic usage so we can improve the platform.',
        ] },
        { heading: 'Essential vs optional', paragraphs: [
          'Essential cookies are required for the platform to function (for example, to keep you signed in) and cannot be switched off. Any non-essential cookies are used only where permitted, and you can control them through your browser or device settings.',
        ] },
        { heading: 'Managing cookies', paragraphs: [
          'Most browsers let you refuse or delete cookies through their settings. Blocking essential cookies may stop parts of the platform from working. On mobile, you can manage device identifiers through your device settings.',
        ] },
        { heading: 'Contact', paragraphs: [
          `If you have questions about our use of cookies, contact us at ${COMPANY.supportEmail}.`,
        ] },
      ]}
    />
  );
}
