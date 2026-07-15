'use client';

import type { OnboardingData } from '../wizard';
import { SectionLabel } from '@/components/avanti/section-label';
import { Input } from '@/components/ui/input';
import { DocumentUpload } from '../document-upload';
import { cn } from '@/lib/utils/cn';

/**
 * Identity step — first thing we ask for.
 *
 * Six ordinal-numbered subsections: ID type choice, ID upload, ID number,
 * selfie, legal name, date of birth. Ends with a privacy banner.
 */

const ID_TYPES: { value: string; label: string; help: string }[] = [
  { value: 'nin', label: 'NIN slip', help: 'From your NIMC enrolment' },
  { value: 'drivers_licence', label: "Driver's licence", help: 'Nigerian FRSC-issued' },
  { value: 'passport', label: 'International passport', help: 'Data page only' },
];

export function StepIdentity({
  data,
  onUpdate,
}: {
  data: OnboardingData;
  onUpdate: (patch: OnboardingData) => void;
}) {
  const identity = data.identity ?? {};
  const set = (patch: Partial<typeof identity>) => onUpdate({ identity: patch });

  return (
    <div className="space-y-14">
      <p className="max-w-2xl font-display text-2xl leading-snug text-ink md:text-3xl">
        First things first — <em className="italic">who are you?</em>
      </p>

      <p className="max-w-2xl font-body leading-relaxed text-ink">
        We need one government-issued ID plus a selfie holding it. The same check any
        regulated Nigerian bank runs before opening an account. Nothing leaves our system
        and customers never see these documents.
      </p>

      {/* 01 · Which ID */}
      <div>
        <SectionLabel>01 · Which ID?</SectionLabel>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {ID_TYPES.map((t) => {
            const active = identity.id_type === t.value;
            return (
              <button
                key={t.value}
                onClick={() => set({ id_type: t.value })}
                className={cn(
                  'border p-4 text-left transition-colors',
                  active
                    ? 'border-ink bg-ink text-paper'
                    : 'border-line-strong bg-paper text-ink hover:bg-paper-3'
                )}
              >
                <div className="font-body text-base">{t.label}</div>
                <div
                  className={cn(
                    'mt-1 font-mono text-[10px] uppercase tracking-wider',
                    active ? 'text-paper/70' : 'text-ink-muted'
                  )}
                >
                  {t.help}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 02 · Upload */}
      {identity.id_type && (
        <div>
          <SectionLabel>
            02 · Upload {ID_TYPES.find((t) => t.value === identity.id_type)?.label}
          </SectionLabel>
          <div className="mt-6">
            <DocumentUpload
              kind="id_document"
              currentDocumentId={identity.id_document_id}
              onUploaded={(id: string) => set({ id_document_id: id })}
            />
          </div>
        </div>
      )}

      {/* 03 · Number */}
      <div>
        <SectionLabel>03 · ID number</SectionLabel>
        <label className="mt-6 block max-w-md">
          <span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
            As printed on the document
          </span>
          <Input
            value={identity.id_number ?? ''}
            onChange={(e) => set({ id_number: e.target.value })}
            className="font-mono"
            placeholder={identity.id_type === 'nin' ? '12345678901' : ''}
          />
        </label>
      </div>

      {/* 04 · Selfie */}
      <div>
        <SectionLabel>04 · Selfie holding your ID</SectionLabel>
        <p className="mt-3 max-w-2xl font-body text-sm leading-relaxed text-ink-muted">
          Hold the ID next to your face. Both should be clearly visible and legible.
          Natural light works best.
        </p>
        <div className="mt-6">
          <DocumentUpload
            kind="selfie"
            currentDocumentId={identity.selfie_document_id}
            onUploaded={(id: string) => set({ selfie_document_id: id })}
          />
        </div>
      </div>

      {/* 05 · Legal name */}
      <div>
        <SectionLabel>05 · Your legal name</SectionLabel>
        <label className="mt-6 block max-w-md">
          <span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
            Exactly as it appears on your ID
          </span>
          <Input
            value={identity.full_name_legal ?? ''}
            onChange={(e) => set({ full_name_legal: e.target.value })}
            placeholder="Temitayo Adekunle Gbenro"
          />
        </label>
      </div>

      {/* 06 · DOB */}
      <div>
        <SectionLabel>06 · Date of birth</SectionLabel>
        <label className="mt-6 block max-w-xs">
          <Input
            type="date"
            value={identity.date_of_birth ?? ''}
            onChange={(e) => set({ date_of_birth: e.target.value })}
            className="font-mono"
          />
        </label>
      </div>

      {/* Privacy banner */}
      <div className="border-l-2 border-brass bg-brass-soft px-6 py-5">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-brass">
          Privacy
        </div>
        <p className="mt-2 max-w-xl font-body text-sm leading-relaxed text-ink">
          These documents are stored encrypted and only visible to our verification team.
          Customers see your name and portrait — never these files.
        </p>
      </div>
    </div>
  );
}
