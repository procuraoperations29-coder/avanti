/**
 * Onboarding wizard — canonical step list and state shape.
 *
 * The `onboarding_state` jsonb on driver_profiles is the single source
 * of truth for wizard progress. Each step page reads it, renders a form,
 * and writes back through /api/driver/onboarding/save-step.
 *
 * Availability preference (step 6) writes directly to driver_profiles.
 * The other steps live inside the jsonb until submit.
 */

export const ONBOARDING_STEPS = [
  'start',
  'identity',
  'licence',
  'address',
  'background',
  'experience',
  'availability',
  'payout',
  'review',
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export function ordinalFor(step: OnboardingStep): string {
  const middleSteps = ONBOARDING_STEPS.slice(1, -1);
  const idx = middleSteps.indexOf(step as (typeof middleSteps)[number]);
  if (idx === -1) return '';
  return String(idx + 1).padStart(2, '0');
}

export function stepLabel(step: OnboardingStep): string {
  const labels: Record<OnboardingStep, string> = {
    start: 'Welcome',
    identity: 'Identity',
    licence: 'Licence',
    address: 'Address',
    background: 'Background',
    experience: 'Experience',
    availability: 'Availability',
    payout: 'Payout',
    review: 'Review',
  };
  return labels[step] ?? step;
}

// Step data shapes (all fields optional — filled progressively)

export interface IdentityData {
  legal_name?: string;
  date_of_birth?: string; // YYYY-MM-DD
  gender?: 'male' | 'female' | 'prefer_not_to_say';
  id_type?: 'nin' | 'passport' | 'drivers_licence' | 'voters_card';
  id_number?: string;
  id_front_path?: string;
  id_back_path?: string;
  selfie_path?: string;
  next_of_kin_name?: string;
  next_of_kin_phone?: string;
  next_of_kin_relationship?: string;
}

export interface LicenceData {
  licence_number?: string;
  licence_class?: string;
  issue_date?: string;
  expiry_date?: string;
  licence_front_path?: string;
  licence_back_path?: string;
}

export interface AddressData {
  street_address?: string;
  city?: string;
  state?: string;
  landmark?: string;
  utility_bill_path?: string;
}

export interface Reference {
  name?: string;
  phone?: string;
  relationship?: string;
  years_known?: number;
}

export interface BackgroundData {
  references?: Reference[];
  criminal_record_disclosure?: boolean;
  criminal_record_details?: string;
}

export interface ExperienceData {
  years_experience?: number;
  vehicle_classes?: string[]; // ['sedan', 'suv', 'bus', 'lorry']
  transmission_experience?: string[]; // ['automatic', 'manual']
  languages?: string[];
  can_drive_at_night?: boolean;
  has_smartphone?: boolean;
  service_radius_km?: number;
}

export interface PayoutData {
  bank_name?: string;
  bank_code?: string;
  account_number?: string;
  account_holder_name?: string;
}

export interface OnboardingState {
  identity?: IdentityData;
  licence?: LicenceData;
  address?: AddressData;
  background?: BackgroundData;
  experience?: ExperienceData;
  payout?: PayoutData;
  last_step_completed?: OnboardingStep;
}

// Nigerian banks — used in the payout step dropdown
export const NIGERIAN_BANKS: { code: string; name: string }[] = [
  { code: '044', name: 'Access Bank' },
  { code: '063', name: 'Access Bank (Diamond)' },
  { code: '050', name: 'Ecobank' },
  { code: '070', name: 'Fidelity Bank' },
  { code: '011', name: 'First Bank of Nigeria' },
  { code: '214', name: 'First City Monument Bank' },
  { code: '058', name: 'Guaranty Trust Bank' },
  { code: '030', name: 'Heritage Bank' },
  { code: '082', name: 'Keystone Bank' },
  { code: '076', name: 'Polaris Bank' },
  { code: '221', name: 'Stanbic IBTC Bank' },
  { code: '068', name: 'Standard Chartered' },
  { code: '232', name: 'Sterling Bank' },
  { code: '100', name: 'Suntrust Bank' },
  { code: '032', name: 'Union Bank' },
  { code: '033', name: 'United Bank for Africa' },
  { code: '215', name: 'Unity Bank' },
  { code: '035', name: 'Wema Bank' },
  { code: '057', name: 'Zenith Bank' },
  { code: '090175', name: 'Rubies MFB' },
  { code: '090267', name: 'Kuda Bank' },
  { code: '090405', name: 'MoniePoint' },
  { code: '100004', name: 'Opay' },
  { code: '090317', name: 'PalmPay' },
];
