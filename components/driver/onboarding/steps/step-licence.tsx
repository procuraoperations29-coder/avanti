'use client';

import { SectionLabel } from '@/components/avanti/section-label';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DocumentUpload } from '@/components/driver/document-upload';
import type { StepProps } from '../wizard';

export function StepLicence({ data, update }: StepProps) {
  return (
    <div className="space-y-6">
      <div>
        <SectionLabel>Front of licence</SectionLabel>
        <div className="mt-3">
          <DocumentUpload
            kind="drivers_licence"
            label="Photo of the front"
            hint="All text legible"
            captureCamera
            existingDocumentId={data.licence.licenceFrontDocumentId}
            onUploaded={(id) => update({ licence: { licenceFrontDocumentId: id } })}
          />
        </div>
      </div>

      <div>
        <SectionLabel>Back of licence</SectionLabel>
        <div className="mt-3">
          <DocumentUpload
            kind="drivers_licence"
            label="Photo of the back"
            captureCamera
            existingDocumentId={data.licence.licenceBackDocumentId}
            onUploaded={(id) => update({ licence: { licenceBackDocumentId: id } })}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="licence-number">Licence number</Label>
          <Input
            id="licence-number"
            className="mt-2"
            value={data.licence.licenceNumber ?? ''}
            placeholder="AKD12345AB"
            onChange={(e) => update({ licence: { licenceNumber: e.target.value } })}
          />
        </div>
        <div>
          <Label htmlFor="licence-expiry">Expiry date</Label>
          <Input
            id="licence-expiry"
            type="date"
            className="mt-2"
            value={data.licence.licenceExpiryDate ?? ''}
            onChange={(e) => update({ licence: { licenceExpiryDate: e.target.value } })}
          />
        </div>
      </div>
    </div>
  );
}
