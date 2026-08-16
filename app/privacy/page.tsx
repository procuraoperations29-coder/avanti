import type { Metadata } from 'next';
import { LegalPage } from '@/components/marketing/legal-page';
import { COMPANY } from '@/config/company';

export const metadata: Metadata = { title: 'Privacy Policy · Avanti' };
const UPDATED = '16 August 2026';

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated={UPDATED}
      intro={`This Policy explains how ${COMPANY.legalName} ("Avanti") collects, uses, and protects your personal data when you use our platform. We process personal data in line with the Nigeria Data Protection Act 2023 (NDPA) and applicable regulations.`}
      sections={[
        { heading: 'Data we collect', paragraphs: ['Depending on how you use the platform, we may collect:'], bullets: [
          'Account and contact details: name, phone number, email, and password.',
          'Customer booking details: pickup addresses, engagement dates, instructions, and payment records.',
          'Driver verification data: date of birth, government ID and ID number (e.g. NIN), driver’s licence, address, background disclosures, a photo/selfie, bank/payout details, and next-of-kin/emergency contact.',
          'Usage and device data: log data, device and app-install information, and notification preferences.',
        ] },
        { heading: 'How we use your data', paragraphs: ['We use personal data to:'], bullets: [
          'Provide and operate the platform — matching customers and drivers, processing bookings, payments, and payouts.',
          'Verify drivers and maintain safety, quality and trust.',
          'Generate and manage the agreements you sign electronically.',
          'Communicate with you, including confirmations, receipts, and service notifications.',
          'Prevent fraud, resolve disputes, and comply with legal obligations.',
        ] },
        { heading: 'Lawful basis', paragraphs: [
          'We process personal data on the bases permitted by the NDPA, including performance of a contract with you, your consent (where required), our legitimate interests in operating a safe platform, and compliance with legal obligations.',
        ] },
        { heading: 'What customers and drivers can see', paragraphs: [
          'Before booking, customers see a driver’s photo, bio, tier, experience and ratings — not their contact details. After payment, the customer is given the driver’s contact details to coordinate the engagement.',
          'A driver’s sensitive identity details (such as national identification) and next-of-kin information are never shown to customers. They are held securely by Avanti and released only where necessary to resolve a dispute or where required by law.',
        ] },
        { heading: 'Sharing with third parties', paragraphs: ['We share personal data only as needed to run the service:'], bullets: [
          'Payment processing is handled by our payment provider (Paystack); card details are entered directly with the provider, not stored by Avanti.',
          'Leasing partners receive the information necessary to fulfil a car-hire booking.',
          'Service providers that host our systems and send notifications, under appropriate confidentiality obligations.',
          'Authorities or advisers where required by law or to protect rights and safety.',
        ] },
        { heading: 'Storage and security', paragraphs: [
          'Documents and sensitive data are stored in access-controlled systems with role-based permissions. We apply administrative and technical safeguards appropriate to the sensitivity of the data. No system is perfectly secure, but we work to protect your information and to limit access to those who need it.',
        ] },
        { heading: 'Retention', paragraphs: [
          'We keep personal data for as long as needed to provide the service, meet legal, tax and accounting obligations, and resolve disputes. When no longer required, data is deleted or anonymised.',
        ] },
        { heading: 'Your rights', paragraphs: ['Subject to the NDPA, you may:'], bullets: [
          'Request access to the personal data we hold about you.',
          'Request correction of inaccurate data or updating of your details.',
          'Request deletion or restriction of processing in certain circumstances.',
          'Object to certain processing, and withdraw consent where processing is based on consent.',
        ] },
        { heading: 'Contact and complaints', paragraphs: [
          `To exercise your rights or ask a question, contact us at ${COMPANY.supportEmail}. You also have the right to lodge a complaint with the Nigeria Data Protection Commission (NDPC).`,
        ] },
        { heading: 'Changes to this Policy', paragraphs: [
          'We may update this Policy from time to time; material changes will be notified through the platform, and the “last updated” date above will change.',
        ] },
      ]}
    />
  );
}
