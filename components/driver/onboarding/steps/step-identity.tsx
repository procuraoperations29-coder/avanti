'use client';

import { SectionLabel } from '@/components/avanti/section-label';
import { DocumentUpload } from '@/components/driver/document-upload';
import type { StepProps } from '../wizard';

const ID_OPTIONS = [
  { value: 'national_id', label: 'National ID card' },
  { value: 'passport', label: 'International passport' },
  { value: 'drivers_licence', label: "Driver's licence (as ID)" },
] as const;

export function StepIdentity({ data, update }: StepProps) {
  const idKind = data.identity.idKind ?? 'national_id';

  return (
    <div className="space-y-6">
      <div>
        <SectionLabel>Which ID are you using</SectionLabel>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {ID_OPTIONS.map((opt) => {
            const selected = idKind === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => update({ identity: { idKind: opt.value } })}
                className={
                  'border p-3 text-left font-body text-sm transition-colors ' +
                  (selected
                    ? 'border-ink bg-ink text-paper'
                    : 'border-line-strong bg-paper-2 text-ink hover:bg-paper-3')
                }
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <SectionLabel>Front of ID</SectionLabel>
        <div className="mt-3">
          <DocumentUpload
            kind={idKind}
            label="Photo of the front"
            hint="Well lit, in focus, all corners visible"
            captureCamera
            existingDocumentId={data.identity.idFrontDocumentId}
            onUploaded={(id) => update({ identity: { idFrontDocumentId: id } })}
          />
        </div>
      </div>

      <div>
        <SectionLabel>Back of ID · optional for passports</SectionLabel>
        <div className="mt-3">
          <DocumentUpload
            kind={idKind}
            label="Photo of the back"
            captureCamera
            existingDocumentId={data.identity.idBackDocumentId}
            onUploaded={(id) => update({ identity: { idBackDocumentId: id } })}
          />
        </div>
      </div>

      <div>
        <SectionLabel>Selfie</SectionLabel>
        <p className="mt-1 font-body text-sm text-ink-muted">
          Take a photo of yourself holding your ID next to your face.
        </p>
        <div className="mt-3">
          <DocumentUpload
            kind="selfie"
            label="Take a selfie"
            hint="Face + ID visible in the same frame"
            captureCamera
            existingDocumentId={data.identity.selfieDocumentId}
            onUploaded={(id) => update({ identity: { selfieDocumentId: id } })}
          />
        </div>
      </div>
    </div>
  );
}
