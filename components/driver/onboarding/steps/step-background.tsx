'use client';

import { SectionLabel } from '@/components/avanti/section-label';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import type { StepProps } from '../wizard';

export function StepBackground({ data, update }: StepProps) {
  const consented = data.background.consentGiven ?? false;

  const toggle = () => {
    if (consented) {
      update({ background: { consentGiven: false, consentGivenAt: undefined } });
    } else {
      update({
        background: {
          consentGiven: true,
          consentGivenAt: new Date().toISOString(),
        },
      });
    }
  };

  return (
    <div className="space-y-6">
      <p className="font-body leading-relaxed text-ink">
        Avanti runs a background check through a licensed provider. The check looks for prior
        driving offences, criminal history relevant to safety, and validity of your driver&apos;s
        licence.
      </p>

      <div>
        <SectionLabel>What we check</SectionLabel>
        <ul className="mt-3 space-y-2 border-t border-line pt-3">
          {[
            'Nigerian criminal history (federal and state)',
            'FRSC traffic offences on file',
            'Licence authenticity and current status',
            'Prior employer references, where provided',
          ].map((item) => (
            <li key={item} className="flex items-start gap-2 font-body text-sm text-ink">
              <div className="mt-1 h-1 w-1 shrink-0 rounded-full bg-ink-muted" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      <button
        type="button"
        onClick={toggle}
        className={cn(
          'flex w-full items-start gap-3 border p-4 text-left transition-colors',
          consented
            ? 'border-green bg-green-soft'
            : 'border-line-strong bg-paper-2 hover:bg-paper-3'
        )}
      >
        <div
          className={cn(
            'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center border',
            consented ? 'border-green bg-green' : 'border-line-strong bg-paper'
          )}
        >
          {consented && <Check className="h-3.5 w-3.5 text-paper" strokeWidth={3} />}
        </div>
        <div className="flex-1">
          <div className="font-body text-sm text-ink">
            I consent to Avanti running a background check on me for the purposes of verifying my
            eligibility to work as a professional driver on the platform.
          </div>
          {data.background.consentGivenAt && (
            <div className="mt-2 font-mono text-[10px] uppercase tracking-wider text-ink-muted">
              Consented at {new Date(data.background.consentGivenAt).toLocaleString()}
            </div>
          )}
        </div>
      </button>
    </div>
  );
}
