'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';
import { DocumentUpload } from '@/components/driver/onboarding/document-upload';
import type { AddressData } from '@/lib/onboarding/state';
import { cn } from '@/lib/utils/cn';

const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue',
  'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu',
  'FCT (Abuja)', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina',
  'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo',
  'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara',
];

export function AddressStepForm({ initialData }: { initialData: AddressData }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const [streetAddress, setStreetAddress] = useState(initialData.street_address ?? '');
  const [city, setCity] = useState(initialData.city ?? '');
  const [state, setState] = useState(initialData.state ?? '');
  const [landmark, setLandmark] = useState(initialData.landmark ?? '');
  const [utilityBillPath, setUtilityBillPath] = useState(
    initialData.utility_bill_path ?? ''
  );

  const canContinue =
    streetAddress.trim().length >= 5 &&
    city.trim().length >= 2 &&
    state.length > 0 &&
    utilityBillPath.length > 0;

  const saveAndContinue = async () => {
    if (!canContinue) {
      toast.error('Please complete all address fields and upload proof of address.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/driver/onboarding/save-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: 'address',
          data: {
            street_address: streetAddress.trim(),
            city: city.trim(),
            state,
            landmark: landmark.trim() || null,
            utility_bill_path: utilityBillPath,
          },
        }),
      });
      const body = (await res.json()) as { saved?: boolean; error?: string; message?: string };
      if (!res.ok) {
        toast.error(body.message ?? body.error ?? 'Save failed');
        return;
      }
      router.push('/driver/onboarding/step-background');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      {/* Street address */}
      <div className="mb-8">
        <label
          htmlFor="street"
          className="mb-2 block font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted"
        >
          Street address
        </label>
        <textarea
          id="street"
          value={streetAddress}
          onChange={(e) => setStreetAddress(e.target.value.slice(0, 300))}
          rows={2}
          placeholder="e.g. Flat 3, 12 Adeola Odeku Street"
          className="w-full resize-none border border-line-strong bg-paper-2 p-3 font-body text-sm text-ink placeholder:text-ink-faint focus:border-ink focus:outline-none"
          autoFocus
        />
      </div>

      {/* City + State */}
      <div className="mb-8 grid gap-6 sm:grid-cols-2">
        <div>
          <label
            htmlFor="city"
            className="mb-2 block font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted"
          >
            City / LGA
          </label>
          <Input
            id="city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Victoria Island"
            className="font-body"
          />
        </div>
        <div>
          <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
            State
          </label>
          <select
            value={state}
            onChange={(e) => setState(e.target.value)}
            className={cn(
              'w-full border p-3 font-body text-sm text-ink focus:border-ink focus:outline-none',
              state ? 'border-line-strong bg-paper' : 'border-line-strong bg-paper-2 text-ink-faint'
            )}
          >
            <option value="">Select state…</option>
            {NIGERIAN_STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Landmark */}
      <div className="mb-8">
        <label
          htmlFor="landmark"
          className="mb-2 block font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted"
        >
          Nearest landmark <span className="normal-case tracking-normal text-ink-faint">(optional)</span>
        </label>
        <Input
          id="landmark"
          value={landmark}
          onChange={(e) => setLandmark(e.target.value)}
          placeholder="Near Silverbird Cinema"
          className="font-body"
        />
        <p className="mt-2 font-mono text-[10px] text-ink-muted">
          Helps our verification team confirm your area
        </p>
      </div>

      {/* Utility bill upload */}
      <div className="mb-10">
        <DocumentUpload
          documentType="utility_bill"
          label="Proof of address"
          initialUrl={utilityBillPath}
          onUploaded={setUtilityBillPath}
          helperText="Utility bill, tenancy agreement, or bank statement — dated within the last 6 months"
        />
      </div>

      <div className="flex items-center justify-between border-t border-line pt-8">
        <div className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
          Step 03 of 07
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
