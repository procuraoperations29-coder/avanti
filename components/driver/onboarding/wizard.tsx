'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';
import { StepProgressBar } from '@/components/avanti/step-progress-bar';

import { StepStart } from './steps/step-start';
import { StepIdentity } from './steps/step-identity';
import { StepLicence } from './steps/step-licence';
import { StepAddress } from './steps/step-address';
import { StepBackground } from './steps/step-background';
import { StepExperience } from './steps/step-experience';
import { StepPayout } from './steps/step-payout';
import { StepReview } from './steps/step-review';

/**
 * Driver onboarding wizard.
 *
 * Editorial polish: giant brass step ordinal (01/02/03...), larger
 * display-serif title, more generous whitespace between sections, a
 * heavier bottom rule separating the action row.
 *
 * Behavior unchanged: reads/writes onboarding_state via
 *   GET  /api/driver/onboarding/state
 *   POST /api/driver/onboarding/state
 *   POST /api/driver/onboarding/submit
 */

export type OnboardingData = {
  identity?: {
    id_document_id?: string;
    id_type?: string;
    id_number?: string;
    selfie_document_id?: string;
    full_name_legal?: string;
    date_of_birth?: string;
  };
  licence?: {
    document_id?: string;
    licence_number?: string;
    licence_class?: string;
    licence_country?: string;
    issued_date?: string;
    expires_date?: string;
  };
  address?: {
    document_id?: string;
    line?: string;
    city?: string;
    state?: string;
    postal_code?: string;
  };
  background?: {
    consent_given?: boolean;
    consent_at?: string;
  };
  experience?: {
    years_experience?: number;
    vehicle_class_experience?: string[];
    transmission_experience?: string[];
    languages?: string[];
    bio?: string;
    service_radius_km?: number;
  };
  payout?: {
    bank_name?: string;
    account_number?: string;
    account_holder_name?: string;
    bvn?: string;
  };
};

const ONBOARDING_STEPS = [
  { id: 'start', label: 'Start', longLabel: 'Getting started' },
  { id: 'identity', label: 'Identity', longLabel: 'Confirm your identity' },
  { id: 'licence', label: 'Licence', longLabel: 'Confirm your driving licence' },
  { id: 'address', label: 'Address', longLabel: 'Confirm your address' },
  { id: 'background', label: 'Consent', longLabel: 'Consent to a background check' },
  { id: 'experience', label: 'Experience', longLabel: 'Tell us about your experience' },
  { id: 'payout', label: 'Payout', longLabel: 'Where should we pay you?' },
  { id: 'review', label: 'Review', longLabel: 'Review and submit' },
] as const;

type StepId = (typeof ONBOARDING_STEPS)[number]['id'];

export function OnboardingWizard() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<OnboardingData>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Load persisted state on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/driver/onboarding/state');
        if (!res.ok) return;
        const body = (await res.json()) as {
          state?: OnboardingData;
          currentStep?: number;
        };
        if (body.state) setData(body.state);
        if (typeof body.currentStep === 'number') {
          setCurrentStep(Math.min(body.currentStep, ONBOARDING_STEPS.length - 1));
        }
      } catch {
        // ignore — start fresh
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const persist = useCallback(
    async (next: OnboardingData, stepIndex: number) => {
      setSaving(true);
      try {
        await fetch('/api/driver/onboarding/state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ state: next, currentStep: stepIndex }),
        });
      } finally {
        setSaving(false);
      }
    },
    []
  );

  const updateData = useCallback(
    (patch: OnboardingData) => {
      setData((prev) => {
        const merged: OnboardingData = { ...prev };
        for (const [key, value] of Object.entries(patch) as [
          keyof OnboardingData,
          OnboardingData[keyof OnboardingData],
        ][]) {
          if (value && typeof value === 'object' && !Array.isArray(value)) {
            merged[key] = { ...(prev[key] as object ?? {}), ...value } as never;
          } else {
            merged[key] = value as never;
          }
        }
        return merged;
      });
    },
    []
  );

  const goNext = useCallback(async () => {
    const next = Math.min(currentStep + 1, ONBOARDING_STEPS.length - 1);
    setCurrentStep(next);
    await persist(data, next);
  }, [currentStep, data, persist]);

  const goBack = useCallback(async () => {
    const prev = Math.max(currentStep - 1, 0);
    setCurrentStep(prev);
    await persist(data, prev);
  }, [currentStep, data, persist]);

  const submit = useCallback(async () => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/driver/onboarding/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const body = (await res.json()) as { error?: string; message?: string };
      if (!res.ok) {
        toast.error(body.message ?? body.error ?? 'Could not submit');
        return;
      }
      toast.success('Submitted for review');
      router.push('/driver/onboarding/pending');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not submit');
    } finally {
      setSubmitting(false);
    }
  }, [router]);

  if (loading) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-3xl items-center justify-center px-6">
        <Loader2 className="h-6 w-6 animate-spin text-ink-muted" strokeWidth={1.5} />
      </div>
    );
  }

  const step = ONBOARDING_STEPS[currentStep];
  const stepId = step.id as StepId;
  const stepNumber = String(currentStep + 1).padStart(2, '0');

  const stepProps = {
    data,
    onUpdate: updateData,
  };

  return (
    <div className="min-h-screen bg-paper">
      {/* Header */}
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-4xl items-baseline justify-between px-6 py-6">
          <Link href="/" className="font-display text-2xl tracking-tight text-ink">
            Avanti
          </Link>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
            Driver onboarding
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 pt-10 pb-20">
        {/* Progress bar */}
        <div className="mb-16">
          <StepProgressBar
            steps={ONBOARDING_STEPS.map((s) => s.label)}
            current={currentStep}
            compact
          />
        </div>

        {/* Editorial step header */}
        <div className="mb-12 border-t border-line pt-10">
          <div className="flex items-baseline gap-6">
            <div className="font-display text-6xl leading-none text-brass md:text-8xl">
              {stepNumber}
            </div>
            <div className="flex-1">
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                Step {currentStep + 1} of {ONBOARDING_STEPS.length}
              </div>
              <h1 className="mt-2 font-display text-3xl leading-tight text-ink md:text-4xl">
                {step.longLabel}
              </h1>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="min-h-[300px]">
          {stepId === 'start' && <StepStart {...stepProps} />}
          {stepId === 'identity' && <StepIdentity {...stepProps} />}
          {stepId === 'licence' && <StepLicence {...stepProps} />}
          {stepId === 'address' && <StepAddress {...stepProps} />}
          {stepId === 'background' && <StepBackground {...stepProps} />}
          {stepId === 'experience' && <StepExperience {...stepProps} />}
          {stepId === 'payout' && <StepPayout {...stepProps} />}
          {stepId === 'review' && <StepReview {...stepProps} />}
        </div>

        {/* Actions */}
        <div className="mt-16 flex items-center justify-between border-t-2 border-ink pt-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={goBack}
            disabled={currentStep === 0 || saving || submitting}
          >
            <ChevronLeft className="mr-1 h-4 w-4" strokeWidth={1.5} />
            Back
          </Button>

          <div className="flex items-center gap-3">
            {saving && (
              <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                Saving…
              </span>
            )}
            {currentStep === ONBOARDING_STEPS.length - 1 ? (
              <Button onClick={submit} disabled={submitting} size="lg">
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" strokeWidth={1.5} />
                    Submitting…
                  </>
                ) : (
                  <>
                    Submit for review
                    <ArrowRight className="ml-2 h-4 w-4" strokeWidth={1.5} />
                  </>
                )}
              </Button>
            ) : (
              <Button onClick={goNext} disabled={saving || submitting}>
                Continue
                <ChevronRight className="ml-1 h-4 w-4" strokeWidth={1.5} />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
