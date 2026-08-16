import type { Metadata } from 'next';
import { LegalPage } from '@/components/marketing/legal-page';
import { COMPANY } from '@/config/company';

export const metadata: Metadata = { title: 'Terms of Use · Avanti' };
const UPDATED = '16 August 2026';

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Use"
      updated={UPDATED}
      intro={`These Terms govern your use of the Avanti platform operated by ${COMPANY.legalName} ("Avanti", "we", "us"). By creating an account or using the platform, you agree to these Terms. If you do not agree, please do not use the platform.`}
      sections={[
        { heading: 'Who we are and what we do', paragraphs: [
          `${COMPANY.legalName} operates a platform that connects customers with verified professional drivers for on-demand bookings, permanent placements, car hire (with vehicles supplied by leasing partners), corporate staffing, and out-of-state trips. Avanti facilitates these engagements and, where stated, collects payment and remits amounts to drivers and partners.`,
          'Avanti does not itself own the vehicles used in car-hire bookings; those are provided by third-party leasing partners.',
        ] },
        { heading: 'Eligibility and accounts', paragraphs: [
          'You must be at least 18 years old and able to enter a binding contract. You are responsible for the accuracy of the information you provide and for keeping your sign-in credentials secure.',
          'Drivers must complete verification, provide accurate identity, licence, address and background information, and keep it up to date. Avanti may decline, suspend, or remove any account that breaches these Terms or our standards.',
        ] },
        { heading: 'Bookings, contracts and payment', paragraphs: [
          'Each engagement is governed by an agreement generated for that transaction, which you review and sign electronically before payment. Prices shown include applicable VAT. Payment is processed by our payment provider; a booking is confirmed only once payment is received.',
          'For permanent placements and corporate staffing, separate fees, salaries and invoicing terms apply as set out at the point of booking.',
        ] },
        { heading: 'Cancellations and refunds', paragraphs: [
          'Customers may cancel an on-demand engagement, giving a reason. Cancellation fees depend on how much notice is given before the start time, as shown to you at the point of cancellation, and any eligible balance is refunded to your original payment method. Avanti may cancel and refund an engagement where necessary (for example, safety or availability).',
        ] },
        { heading: 'Conduct', paragraphs: [
          'You agree to use the platform lawfully and to treat drivers, customers, partners and staff with respect. You must not require or perform any unlawful, unsafe, or discriminatory act. Drivers may decline instructions that are unsafe or unlawful.',
        ] },
        { heading: 'Driver relationship', paragraphs: [
          'Drivers provide services as independent contractors through the platform unless a separate written agreement states otherwise. Nothing on the platform creates an employment relationship between a customer and a driver.',
        ] },
        { heading: 'Intellectual property', paragraphs: [
          'The Avanti platform, its content and branding are owned by Avanti or its licensors. You may not copy, resell, or misuse the platform or its content.',
        ] },
        { heading: 'Liability', paragraphs: [
          'Avanti verifies drivers to the stated tier and facilitates engagements, but does not guarantee uninterrupted service and is not liable for indirect or consequential loss. To the extent permitted by law, Avanti’s aggregate liability for any claim relating to an engagement is limited to the fees paid for that engagement.',
        ] },
        { heading: 'Suspension and termination', paragraphs: [
          'We may suspend or terminate access for breach of these Terms, suspected fraud, or to protect users. You may stop using the platform at any time; obligations that by their nature survive termination will continue to apply.',
        ] },
        { heading: 'Changes and governing law', paragraphs: [
          'We may update these Terms from time to time; material changes will be notified through the platform. These Terms are governed by the laws of the Federal Republic of Nigeria.',
          `Questions about these Terms can be sent to ${COMPANY.supportEmail}.`,
        ] },
      ]}
    />
  );
}
