/**
 * Contract term generation — builds the structured `terms` jsonb stored on a
 * contract and rendered on-screen for signing. Isomorphic (pure), so the same
 * types back both the API and the display component.
 */

export interface ContractSummaryItem { label: string; value: string }
export interface ContractSection { heading: string; body: string }
export interface ContractTerms {
  title: string;
  reference: string;
  generatedAt: string; // ISO date
  intro: string;
  summary: ContractSummaryItem[];
  sections: ContractSection[];
  jurisdictionNote: string;
}

function naira(n: number): string {
  return `₦${Math.round(n).toLocaleString('en-NG')}`;
}
function fmtDateTime(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export interface CustomerContractParams {
  reference: string;
  customerName: string;
  driverName: string;
  engagementType: string;
  vehicleClass?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  expectedDailyHours?: number | null;
  pickup?: string | null;
  currency: string;
  customerPriceTotal: number;
  cancelPolicy: { freeHours: number; nearHours: number; feeNear: number; feeMid: number };
  generatedAt: string;
}

export function buildCustomerContractTerms(p: CustomerContractParams): ContractTerms {
  const near = Math.round(p.cancelPolicy.feeNear * 100);
  const mid = Math.round(p.cancelPolicy.feeMid * 100);
  return {
    title: 'Avanti On-Demand Driver Engagement Agreement',
    reference: p.reference,
    generatedAt: p.generatedAt,
    intro:
      `This Agreement is made between Avanti Mobility ("Avanti"), ${p.customerName} ("the Customer"), ` +
      `and covers the professional driving engagement described below, performed by ${p.driverName} ("the Driver"). ` +
      'By signing electronically, the Customer confirms they have read and accepted these terms.',
    summary: [
      { label: 'Driver', value: p.driverName },
      { label: 'Service', value: p.engagementType.replace(/_/g, ' ') + (p.vehicleClass ? ` · ${p.vehicleClass}` : '') },
      { label: 'Start', value: fmtDateTime(p.startsAt) },
      ...(p.endsAt ? [{ label: 'End', value: fmtDateTime(p.endsAt) }] : []),
      ...(p.expectedDailyHours ? [{ label: 'Hours per day', value: String(p.expectedDailyHours) }] : []),
      ...(p.pickup ? [{ label: 'Pickup', value: p.pickup }] : []),
      { label: 'Total payable', value: `${naira(p.customerPriceTotal)} (${p.currency}, incl. VAT)` },
    ],
    sections: [
      { heading: '1. Services', body: `Avanti will provide a verified professional driver (${p.driverName}) for the engagement described above. The Customer supplies the vehicle unless a separate car-hire arrangement applies. The Driver will conduct the engagement professionally, punctually, and in line with Avanti's standards.` },
      { heading: '2. Fees & Payment', body: `The total fee of ${naira(p.customerPriceTotal)} (inclusive of VAT) is payable in advance to confirm the booking. The engagement is confirmed only once payment is received.` },
      { heading: '3. Cancellation & Refunds', body: `The Customer may cancel with a compulsory reason. Cancellation with at least ${p.cancelPolicy.freeHours} hours' notice before the start time is free and fully refunded. Cancelling between ${p.cancelPolicy.nearHours} and ${p.cancelPolicy.freeHours} hours before the start attracts a ${mid}% fee. Cancelling within ${p.cancelPolicy.nearHours} hours of the start attracts a ${near}% fee. The remaining balance is refunded to the original payment method.` },
      { heading: '4. Conduct & Safety', body: 'The Customer agrees to treat the Driver with respect, to not require any unlawful activity, and to ensure a safe working environment. The Driver may decline instructions that are unsafe or unlawful. Avanti may suspend or reassign a driver where necessary.' },
      { heading: '5. Driver Information & Privacy', body: 'After payment, the Customer is given the Driver’s contact details for coordination. The Customer must not misuse, publish, or retain the Driver’s personal data beyond the engagement. Sensitive identity details (e.g. national identification and the Driver’s next-of-kin) are held by Avanti and released only where required to resolve a dispute or by law.' },
      { heading: '6. Liability', body: 'Avanti facilitates the engagement and verifies drivers to the stated tier, but is not liable for indirect or consequential loss. Avanti’s aggregate liability for any claim is limited to the total fee paid for the engagement.' },
      { heading: '7. Disputes', body: 'Any dispute should be raised with Avanti promptly. Avanti will mediate in good faith. Escrowed funds (where applicable) may be held pending resolution.' },
    ],
    jurisdictionNote: 'This Agreement is governed by the laws of the Federal Republic of Nigeria.',
  };
}

export interface DriverContractParams {
  reference: string;
  driverName: string;
  dateOfBirth?: string | null;
  idType?: string | null;
  idNumber?: string | null;      // NIN — the driver's own contract
  licenceNumber?: string | null;
  licenceClass?: string | null;
  address?: string | null;
  tier: string;
  bankName?: string | null;
  accountLast4?: string | null;
  nextOfKinName?: string | null;
  nextOfKinPhone?: string | null;
  nextOfKinRelationship?: string | null;
  commissionNote: string;
  generatedAt: string;
}

export function buildDriverContractTerms(p: DriverContractParams): ContractTerms {
  const kin = [p.nextOfKinName, p.nextOfKinRelationship ? `(${p.nextOfKinRelationship})` : null, p.nextOfKinPhone].filter(Boolean).join(' ');
  return {
    title: 'Avanti Driver Services Agreement',
    reference: p.reference,
    generatedAt: p.generatedAt,
    intro:
      `This Agreement is made between Avanti Mobility ("Avanti") and ${p.driverName} ("the Driver"). ` +
      'It sets out the terms on which the Driver offers professional driving services through the Avanti platform, based on the information provided during onboarding. ' +
      'By signing electronically, the Driver confirms the information is accurate and accepts these terms.',
    summary: [
      { label: 'Driver', value: p.driverName },
      ...(p.dateOfBirth ? [{ label: 'Date of birth', value: p.dateOfBirth }] : []),
      ...(p.idNumber ? [{ label: `ID (${(p.idType ?? 'ID').replace(/_/g, ' ')})`, value: p.idNumber }] : []),
      ...(p.licenceNumber ? [{ label: 'Licence', value: `${p.licenceNumber}${p.licenceClass ? ` · ${p.licenceClass}` : ''}` }] : []),
      ...(p.address ? [{ label: 'Address', value: p.address }] : []),
      { label: 'Verification tier', value: p.tier.toUpperCase() },
      ...(p.bankName || p.accountLast4 ? [{ label: 'Payout account', value: `${p.bankName ?? ''}${p.accountLast4 ? ` •••• ${p.accountLast4}` : ''}`.trim() }] : []),
      ...(kin ? [{ label: 'Next of kin', value: kin }] : []),
    ],
    sections: [
      { heading: '1. Engagement', body: 'The Driver provides professional driving services as an independent contractor via the Avanti platform. Nothing in this Agreement creates a partnership or employer-employee relationship unless separately agreed in writing.' },
      { heading: '2. Verification & Accuracy', body: 'The Driver confirms that all identity, licence, address, and background information supplied during onboarding is true and current, and will notify Avanti promptly of any change. Avanti verifies documents to assign a service tier.' },
      { heading: '3. Standards & Conduct', body: 'The Driver will conduct every engagement safely, lawfully, punctually and professionally, maintain a valid driving licence, and comply with Avanti’s code of conduct. Avanti may suspend or remove a driver for breaches.' },
      { heading: '4. Payment & Payouts', body: `Avanti collects customer payments and remits the Driver’s share to the payout account on record. ${p.commissionNote}` },
      { heading: '5. Confidentiality & Customer Data', body: 'The Driver will keep customer information confidential, use it only to perform the engagement, and not retain or share it afterwards.' },
      { heading: '6. Personal Data & Next of Kin', body: 'Avanti holds the Driver’s identity details (including national identification) and next-of-kin/emergency contact securely. These are used for verification, safety and dispute resolution, and are not disclosed to customers.' },
      { heading: '7. Term & Termination', body: 'Either party may end this Agreement with reasonable notice. Avanti may suspend access immediately for safety, fraud, or serious breach. Obligations of confidentiality survive termination.' },
    ],
    jurisdictionNote: 'This Agreement is governed by the laws of the Federal Republic of Nigeria.',
  };
}
