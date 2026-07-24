/**
 * Onboarding step definitions.
 *
 * The order here is the flow order. Each step has an id (used as URL slug
 * and state key), a short label (shown in the progress bar), and a longer
 * label (used in headings and menus).
 *
 * Adding a new step requires touching this file and adding the matching
 * route under `app/(driver)/driver/onboarding/step-<id>/`.
 */

export const ONBOARDING_STEPS = [
  { id: 'start', label: 'Start', longLabel: 'Get started' },
  { id: 'identity', label: 'Identity', longLabel: 'Prove your identity' },
  { id: 'licence', label: 'Licence', longLabel: "Driver's licence" },
  { id: 'address', label: 'Address', longLabel: 'Proof of address' },
  { id: 'background', label: 'Background', longLabel: 'Background check consent' },
  { id: 'experience', label: 'Experience', longLabel: 'Your driving experience' },
  { id: 'payout', label: 'Payout', longLabel: 'How you get paid' },
  { id: 'review', label: 'Review', longLabel: 'Review & submit' },
] as const;

export type OnboardingStepId = (typeof ONBOARDING_STEPS)[number]['id'];

export function stepIndex(id: OnboardingStepId): number {
  return ONBOARDING_STEPS.findIndex((s) => s.id === id);
}

/**
 * Given the current state, figure out what step to land on. Preserves
 * whatever was saved in state.currentStep, but clamps to a valid range.
 */
export function resumeStep(savedIndex: number | undefined): number {
  if (typeof savedIndex !== 'number' || savedIndex < 0) return 0;
  return Math.min(savedIndex, ONBOARDING_STEPS.length - 1);
}
