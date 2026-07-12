'use client';

import { SectionLabel } from '@/components/avanti/section-label';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { DocumentUpload } from '@/components/driver/document-upload';
import type { StepProps } from '../wizard';

export function StepAddress({ data, update }: StepProps) {
  return (
    <div className="space-y-6">
      <p className="font-body text-sm text-ink-muted">
        Any document dated within the last three months that shows your name and address —
        utility bill, bank statement, or a lease agreement will all work.
      </p>

      <div>
        <SectionLabel>Upload the document</SectionLabel>
        <div className="mt-3">
          <DocumentUpload
            kind="proof_of_address"
            label="Upload proof of address"
            hint="Photo or PDF"
            existingDocumentId={data.address.addressProofDocumentId}
            onUploaded={(id) => update({ address: { addressProofDocumentId: id } })}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="address-line">Address as it appears · optional</Label>
        <Textarea
          id="address-line"
          className="mt-2"
          placeholder="12 Marina Road, Ikoyi, Lagos"
          value={data.address.addressLine ?? ''}
          onChange={(e) => update({ address: { addressLine: e.target.value } })}
        />
      </div>
    </div>
  );
}
