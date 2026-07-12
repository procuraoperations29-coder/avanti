'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { StepProgressBar } from '@/components/avanti/step-progress-bar';
import { Button } from '@/components/ui/button';
import { ONBOARDING_STEPS, resumeStep } from '@/lib/onboarding/steps';
import type { OnboardingState } from '@/lib/onboarding/schema';

import { StepStart } from './steps/step-start';
import { StepIdentity } from './steps/step-identity';
import { StepLicence } from './steps/step-licence';
import { StepAddress } from './steps/step-address';
import { StepBackground } from './steps/step-background';
import { StepExperience } from './steps/step-experience';
import { StepPayout } from './steps/step-payout';
import { StepReview } from './steps/step-review';

/**
 * OnboardingWizard — the client-side driver of the onboarding flow.
 *
 * State model:
 *   - Loads the saved onboarding_state on mount
 *   - Mutations happen in memory; syncs to server on step transitions
 *   - Submit calls /api/driver/onboarding/submit
 *
 * Each step component receives the current state slice and callbacks.
 */

export interface WizardData {
  identity: NonNullable<OnboardingState['identity']>;
  licence: NonNullable<OnboardingState['licence']>;
  address: NonNullable<OnboardingState['address']>;
  background: NonNullable<OnboardingState['background']>;
  experience: NonNullable<OnboardingState['experience']>;
  payout: NonNullable<OnboardingState['payout']>;
}

export type StepProps = {
  data: WizardData;
  update: (patch: Partial<WizardData>) => void;
};

function emptyData(): WizardData {
  return {
    identity: {},
    licence: {},
    address: {},
    background: {},
    experience: {},
    payout: {},
  };
}

export function OnboardingWizard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<WizardData>(emptyData);
  const [saving, startSaving] = useTransition();
  const [submitting, setSubmitting] = useState(false);

  // Load existing state
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/driver/onboarding/state');
        if (!res.ok) {
          throw new Error('Could not load your progress');
        }
        const body = (await res.json()) as {
          state?: OnboardingState;
          verificationStatus?: string;
        };
        if (cancelled) return;
        if (
          body.verificationStatus === 'submitted' ||
          body.verificationStatus === 'under_review' ||
          body.verificationStatus === 'approved'
        ) {
          router.replace('/driver/onboarding/pending');
          return;
        }
        const state = body.state ?? {};
        setData({
          identity: state.identity ?? {},
          licence: state.licence ?? {},
          address: state.address ?? {},
          background: state.background ?? {},
          experience: state.experience ?? {},
          payout: state.payout ?? {},
        });
        setCurrentStep(resumeStep(state.currentStep));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Load failed');
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const persist = (nextStep: number, nextData: WizardData) => {
    startSaving(async () => {
      try {
        await fetch('/api/driver/onboarding/state', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            currentStep: nextStep,
            ...nextData,
          }),
        });
      } catch {
        // Silent fail — user can retry navigation
      }
    });
  };

  const update = (patch: Partial<WizardData>) => {
    setData((prev) => {
      const next: WizardData = {
        identity: { ...prev.identity, ...(patch.identity ?? {}) },
        licence: { ...prev.licence, ...(patch.licence ?? {}) },
        address: { ...prev.address, ...(patch.address ?? {}) },
        background: { ...prev.background, ...(patch.background ?? {}) },
        experience: { ...prev.experience, ...(patch.experience ?? {}) },
        payout: { ...prev.payout, ...(patch.payout ?? {}) },
      };
      return next;
    });
  };

  const goNext = () => {
    const next = Math.min(ONBOARDING_STEPS.length - 1, currentStep + 1);
    setCurrentStep(next);
    persist(next, data);
  };

  const goBack = () => {
    const next = Math.max(0, currentStep - 1);
    setCurrentStep(next);
    persist(next, data);
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      // Save latest data first
      await fetch('/api/driver/onboarding/state', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentStep, ...data }),
      });
      const res = await fetch('/api/driver/onboarding/submit', { method: 'POST' });
      const body = (await res.json()) as { error?: string; message?: string };
      if (!res.ok) {
        toast.error(body.message ?? body.error ?? 'Submission failed');
        return;
      }
      toast.success('Submitted for verification');
      router.push('/driver/onboarding/pending');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <div className="animate-pulse font-mono text-xs uppercase tracking-wider text-ink-muted">
          Loading your progress…
        </div>
      </div>
    );
  }

  const step = ONBOARDING_STEPS[currentStep];
  const stepProps: StepProps = { data, update };

  return (
    <div className="mx-auto max-w-2xl px-4 pt-8 pb-24 sm:px-6">
      <div className="mb-8">
        <StepProgressBar steps={ONBOARDING_STEPS.map((s) => s.label)} current={currentStep} compact />
      </div>

      <div className="mb-8">
        <div className="font-mono text-xs uppercase tracking-wider text-ink-muted">
          Step {currentStep + 1} of {ONBOARDING_STEPS.length}
        </div>
        <h1 className="mt-2 font-display text-3xl leading-tight text-ink">{step.longLabel}</h1>
      </div>

      <div className="min-h-[300px]">
        {step.id === 'start' && <StepStart {...stepProps} />}
        {step.id === 'identity' && <StepIdentity {...stepProps} />}
        {step.id === 'licence' && <StepLicence {...stepProps} />}
        {step.id === 'address' && <StepAddress {...stepProps} />}
        {step.id === 'background' && <StepBackground {...stepProps} />}
        {step.id === 'experience' && <StepExperience {...stepProps} />}
        {step.id === 'payout' && <StepPayout {...stepProps} />}
        {step.id === 'review' && <StepReview {...stepProps} />}
      </div>

      <div className="mt-8 flex items-center justify-between border-t border-line pt-6">
        <Button variant="ghost" size="sm" onClick={goBack} disabled={currentStep === 0 || saving}>
          <ChevronLeft className="mr-1 h-4 w-4" /> Back
        </Button>

        {saving && (
          <span className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">
            Saving…
          </span>
        )}

        {step.id === 'review' ? (
          <Button onClick={submit} disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit for verification'}
          </Button>
        ) : (
          <Button onClick={goNext} disabled={saving}>
            Continue <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
