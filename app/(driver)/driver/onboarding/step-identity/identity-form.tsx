'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';
import { DocumentUpload } from '@/components/driver/onboarding/document-upload';
import type { IdentityData } from '@/lib/onboarding/state';
import { cn } from '@/lib/utils/cn';

export function IdentityStepForm({ initialData }: { initialData: IdentityData }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const [legalName, setLegalName] = useState(initialData.legal_name ?? '');
  const [dateOfBirth, setDateOfBirth] = useState(initialData.date_of_birth ?? '');
  const [gender, setGender] = useState<IdentityData['gender']>(
    initialData.gender ?? 'prefer_not_to_say'
  );
  const [idType, setIdType] = useState<IdentityData['id_type']>(
    initialData.id_type ?? 'nin'
  );
  const [idNumber, setIdNumber] = useState(initialData.id_number ?? '');
  const [idFrontPath, setIdFrontPath] = useState(initialData.id_front_path ?? '');
  const [idBackPath, setIdBackPath] = useState(initialData.id_back_path ?? '');
  const [selfiePath, setSelfiePath] = useState(initialData.selfie_path ?? '');
  const [kinName, setKinName] = useState(initialData.next_of_kin_name ?? '');
  const [kinPhone, setKinPhone] = useState(initialData.next_of_kin_phone ?? '');
  const [kinRelationship, setKinRelationship] = useState(initialData.next_of_kin_relationship ?? '');

  const canContinue =
    legalName.trim().length >= 2 &&
    dateOfBirth.length === 10 &&
    idType &&
    idNumber.trim().length >= 5 &&
    idFrontPath.length > 0 &&
    selfiePath.length > 0 &&
    kinName.trim().length >= 2 &&
    kinPhone.trim().length >= 6;

  const saveAndContinue = async () => {
    if (!canContinue) {
      toast.error('Please fill in the required fields and upload your ID.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/driver/onboarding/save-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: 'identity',
          data: {
            legal_name: legalName.trim(),
            date_of_birth: dateOfBirth,
            gender,
            id_type: idType,
            id_number: idNumber.trim(),
            id_front_path: idFrontPath,
            id_back_path: idBackPath || null,
            selfie_path: selfiePath,
            next_of_kin_name: kinName.trim(),
            next_of_kin_phone: kinPhone.trim(),
            next_of_kin_relationship: kinRelationship.trim() || null,
          },
        }),
      });
      const body = (await res.json()) as { saved?: boolean; error?: string; message?: string };
      if (!res.ok) {
        toast.error(body.message ?? body.error ?? 'Save failed');
        return;
      }
      router.push('/driver/onboarding/step-licence');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  };

  const genderOptions: Array<{ value: NonNullable<IdentityData['gender']>; label: string }> = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'prefer_not_to_say', label: 'Prefer not to say' },
  ];

  const idTypes: Array<{ value: NonNullable<IdentityData['id_type']>; label: string }> = [
    { value: 'nin', label: 'National ID (NIN)' },
    { value: 'passport', label: 'International passport' },
    { value: 'drivers_licence', label: "Driver's licence" },
    { value: 'voters_card', label: "Voter's card" },
  ];

  return (
    <div>
      {/* Legal name */}
      <div className="mb-8">
        <label
          htmlFor="legal_name"
          className="mb-2 block font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted"
        >
          Legal name (as it appears on your ID)
        </label>
        <Input
          id="legal_name"
          value={legalName}
          onChange={(e) => setLegalName(e.target.value)}
          placeholder="Adaobi Chidinma Okonkwo"
          className="font-body text-base"
          autoFocus
        />
      </div>

      {/* DOB */}
      <div className="mb-8">
        <label
          htmlFor="dob"
          className="mb-2 block font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted"
        >
          Date of birth
        </label>
        <Input
          id="dob"
          type="date"
          value={dateOfBirth}
          onChange={(e) => setDateOfBirth(e.target.value)}
          max={new Date(Date.now() - 18 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
          className="max-w-xs font-mono"
        />
        <p className="mt-2 font-mono text-[10px] text-ink-muted">
          You must be at least 18 years old
        </p>
      </div>

      {/* Gender */}
      <div className="mb-8">
        <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
          Gender
        </label>
        <div className="flex flex-wrap gap-2">
          {genderOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setGender(opt.value)}
              className={cn(
                'border px-4 py-2 font-body text-sm transition-colors',
                gender === opt.value
                  ? 'border-ink bg-ink text-paper'
                  : 'border-line-strong bg-paper text-ink hover:bg-paper-3'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ID type */}
      <div className="mb-8">
        <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
          What ID are you providing?
        </label>
        <div className="grid gap-2 sm:grid-cols-2">
          {idTypes.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setIdType(opt.value)}
              className={cn(
                'border p-3 text-left font-body text-sm transition-colors',
                idType === opt.value
                  ? 'border-ink bg-ink text-paper'
                  : 'border-line-strong bg-paper text-ink hover:bg-paper-3'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ID number */}
      <div className="mb-8">
        <label
          htmlFor="id_number"
          className="mb-2 block font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted"
        >
          ID number
        </label>
        <Input
          id="id_number"
          value={idNumber}
          onChange={(e) => setIdNumber(e.target.value)}
          placeholder={idType === 'nin' ? '12345678901' : 'Your ID number'}
          className="font-mono"
        />
      </div>

      {/* ID uploads */}
      <div className="mb-10 space-y-6">
        <DocumentUpload
          documentType="id_front"
          label="Photo of ID · Front"
          initialUrl={idFrontPath}
          onUploaded={setIdFrontPath}
          helperText="Clear photo showing your name, photo, and ID number"
        />

        <DocumentUpload
          documentType="id_back"
          label="Photo of ID · Back (optional)"
          initialUrl={idBackPath}
          onUploaded={setIdBackPath}
          helperText="If your ID has details on the back"
        />

        <DocumentUpload
          documentType="selfie"
          label="Selfie · Your profile photo"
          initialUrl={selfiePath}
          onUploaded={setSelfiePath}
          helperText="A clear, front-facing photo of your face. This becomes your profile picture — customers see it when choosing a driver."
        />
      </div>

      {/* Next of kin */}
      <div className="mb-10">
        <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">Next of kin / emergency contact</div>
        <p className="mb-4 font-body text-xs leading-relaxed text-ink-muted">
          Held securely for safety and emergencies only. Never shown to customers.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="kin_name" className="mb-2 block font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">Full name</label>
            <Input id="kin_name" value={kinName} onChange={(e) => setKinName(e.target.value)} placeholder="e.g. Ngozi Okafor" />
          </div>
          <div>
            <label htmlFor="kin_phone" className="mb-2 block font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">Phone</label>
            <Input id="kin_phone" value={kinPhone} onChange={(e) => setKinPhone(e.target.value)} placeholder="0803…" className="font-mono" />
          </div>
          <div>
            <label htmlFor="kin_rel" className="mb-2 block font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">Relationship</label>
            <Input id="kin_rel" value={kinRelationship} onChange={(e) => setKinRelationship(e.target.value)} placeholder="e.g. Spouse, Sibling" />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-line pt-8">
        <div className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
          Step 01 of 07
        </div>
        <Button
          onClick={saveAndContinue}
          disabled={busy || !canContinue}
          size="lg"
          className="min-w-[180px]"
        >
          {busy ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" strokeWidth={1.5} />
              Saving…
            </>
          ) : (
            <>
              Continue
              <ArrowRight className="ml-2 h-4 w-4" strokeWidth={1.5} />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
