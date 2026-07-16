'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ArrowRight, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';
import { DocumentUpload } from '@/components/driver/onboarding/document-upload';
import type { LicenceData } from '@/lib/onboarding/state';
import { cn } from '@/lib/utils/cn';

const LICENCE_CLASSES = [
  { code: 'A', label: 'A — Motorcycle' },
  { code: 'B', label: 'B — Cars, taxis, small vehicles' },
  { code: 'C', label: 'C — Vans, small trucks' },
  { code: 'D', label: 'D — Buses' },
  { code: 'E', label: 'E — Heavy trucks, lorries' },
  { code: 'F', label: 'F — Agricultural' },
];

export function LicenceStepForm({ initialData }: { initialData: LicenceData }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const [licenceNumber, setLicenceNumber] = useState(initialData.licence_number ?? '');
  const [licenceClass, setLicenceClass] = useState(initialData.licence_class ?? 'B');
  const [issueDate, setIssueDate] = useState(initialData.issue_date ?? '');
  const [expiryDate, setExpiryDate] = useState(initialData.expiry_date ?? '');
  const [frontPath, setFrontPath] = useState(initialData.licence_front_path ?? '');
  const [backPath, setBackPath] = useState(initialData.licence_back_path ?? '');

  const isExpired = expiryDate && new Date(expiryDate) < new Date();

  const canContinue =
    licenceNumber.trim().length >= 5 &&
    licenceClass &&
    issueDate.length === 10 &&
    expiryDate.length === 10 &&
    !isExpired &&
    frontPath.length > 0 &&
    backPath.length > 0;

  const saveAndContinue = async () => {
    if (isExpired) {
      toast.error('Your licence has expired. Please renew it before applying.');
      return;
    }
    if (!canContinue) {
      toast.error('Please fill all fields and upload both sides of your licence.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/driver/onboarding/save-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: 'licence',
          data: {
            licence_number: licenceNumber.trim(),
            licence_class: licenceClass,
            issue_date: issueDate,
            expiry_date: expiryDate,
            licence_front_path: frontPath,
            licence_back_path: backPath,
          },
        }),
      });
      const body = (await res.json()) as { saved?: boolean; error?: string; message?: string };
      if (!res.ok) {
        toast.error(body.message ?? body.error ?? 'Save failed');
        return;
      }
      router.push('/driver/onboarding/step-address');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      {/* Licence number */}
      <div className="mb-8">
        <label
          htmlFor="licence_number"
          className="mb-2 block font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted"
        >
          Licence number
        </label>
        <Input
          id="licence_number"
          value={licenceNumber}
          onChange={(e) => setLicenceNumber(e.target.value.toUpperCase())}
          placeholder="ABC12345AA"
          className="font-mono"
          autoFocus
        />
      </div>

      {/* Licence class */}
      <div className="mb-8">
        <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
          Licence class
        </label>
        <div className="grid gap-2 sm:grid-cols-2">
          {LICENCE_CLASSES.map((cls) => (
            <button
              key={cls.code}
              type="button"
              onClick={() => setLicenceClass(cls.code)}
              className={cn(
                'border p-3 text-left font-body text-sm transition-colors',
                licenceClass === cls.code
                  ? 'border-ink bg-ink text-paper'
                  : 'border-line-strong bg-paper text-ink hover:bg-paper-3'
              )}
            >
              {cls.label}
            </button>
          ))}
        </div>
        <p className="mt-2 font-mono text-[10px] text-ink-muted">
          Class B covers most private hire work
        </p>
      </div>

      {/* Dates */}
      <div className="mb-8 grid gap-6 sm:grid-cols-2">
        <div>
          <label
            htmlFor="issue_date"
            className="mb-2 block font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted"
          >
            Issue date
          </label>
          <Input
            id="issue_date"
            type="date"
            value={issueDate}
            onChange={(e) => setIssueDate(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            className="font-mono"
          />
        </div>
        <div>
          <label
            htmlFor="expiry_date"
            className="mb-2 block font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted"
          >
            Expiry date
          </label>
          <Input
            id="expiry_date"
            type="date"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
            className={cn('font-mono', isExpired && 'border-oxblood text-oxblood')}
          />
          {isExpired && (
            <div className="mt-2 flex items-start gap-2 font-mono text-[10px] uppercase tracking-wider text-oxblood">
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" strokeWidth={2} />
              <span>Licence is expired — cannot proceed</span>
            </div>
          )}
        </div>
      </div>

      {/* Front + back uploads */}
      <div className="mb-10 space-y-6">
        <DocumentUpload
          documentType="licence_front"
          label="Licence · Front"
          initialUrl={frontPath}
          onUploaded={setFrontPath}
          helperText="Clear photo showing your name, licence number, photo, and expiry date"
        />

        <DocumentUpload
          documentType="licence_back"
          label="Licence · Back"
          initialUrl={backPath}
          onUploaded={setBackPath}
          helperText="Reverse side showing class endorsements"
        />
      </div>

      <div className="flex items-center justify-between border-t border-line pt-8">
        <div className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
          Step 02 of 07
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
