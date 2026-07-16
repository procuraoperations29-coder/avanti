'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';
import type { BackgroundData, Reference } from '@/lib/onboarding/state';
import { cn } from '@/lib/utils/cn';

function emptyReference(): Reference {
  return { name: '', phone: '', relationship: '', years_known: undefined };
}

function isValidReference(r: Reference): boolean {
  return (
    (r.name?.trim().length ?? 0) >= 2 &&
    (r.phone?.trim().length ?? 0) >= 8 &&
    (r.relationship?.trim().length ?? 0) >= 2 &&
    typeof r.years_known === 'number' &&
    r.years_known > 0
  );
}

export function BackgroundStepForm({ initialData }: { initialData: BackgroundData }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const initialRefs = initialData.references ?? [];
  const [refs, setRefs] = useState<Reference[]>(() => {
    const seeded = [...initialRefs];
    while (seeded.length < 2) seeded.push(emptyReference());
    return seeded.slice(0, 2);
  });
  const [disclosure, setDisclosure] = useState<boolean | null>(
    initialData.criminal_record_disclosure ?? null
  );
  const [disclosureDetails, setDisclosureDetails] = useState(
    initialData.criminal_record_details ?? ''
  );

  const canContinue =
    refs.every(isValidReference) &&
    disclosure !== null &&
    (!disclosure || disclosureDetails.trim().length >= 10);

  const updateRef = (index: number, field: keyof Reference, value: unknown) => {
    setRefs((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const saveAndContinue = async () => {
    if (!canContinue) {
      toast.error('Please complete both references and the disclosure question.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/driver/onboarding/save-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: 'background',
          data: {
            references: refs,
            criminal_record_disclosure: disclosure,
            criminal_record_details: disclosure ? disclosureDetails.trim() : null,
          },
        }),
      });
      const body = (await res.json()) as { saved?: boolean; error?: string; message?: string };
      if (!res.ok) {
        toast.error(body.message ?? body.error ?? 'Save failed');
        return;
      }
      router.push('/driver/onboarding/step-experience');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      {refs.map((ref, i) => (
        <div key={i} className="mb-10 border border-line bg-paper-2 p-6">
          <div className="mb-6 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
            Reference {i + 1}
          </div>

          <div className="mb-4">
            <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
              Full name
            </label>
            <Input
              value={ref.name ?? ''}
              onChange={(e) => updateRef(i, 'name', e.target.value)}
              placeholder="Adaobi Chidinma Okonkwo"
              className="font-body"
            />
          </div>

          <div className="mb-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                Phone number
              </label>
              <Input
                type="tel"
                value={ref.phone ?? ''}
                onChange={(e) => updateRef(i, 'phone', e.target.value)}
                placeholder="+2348012345678"
                className="font-mono"
              />
            </div>
            <div>
              <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                Years known
              </label>
              <Input
                type="number"
                min={1}
                max={99}
                value={ref.years_known ?? ''}
                onChange={(e) =>
                  updateRef(i, 'years_known', e.target.value ? parseInt(e.target.value, 10) : undefined)
                }
                placeholder="5"
                className="font-mono"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
              Relationship
            </label>
            <Input
              value={ref.relationship ?? ''}
              onChange={(e) => updateRef(i, 'relationship', e.target.value)}
              placeholder="Former principal, family friend, business partner"
              className="font-body"
            />
          </div>
        </div>
      ))}

      {/* Criminal record disclosure */}
      <div className="mb-10 border border-line bg-paper-2 p-6">
        <div className="mb-4 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
          Disclosure
        </div>

        <p className="mb-4 font-body text-base leading-relaxed text-ink">
          Have you ever been convicted of a criminal offence? (Traffic violations
          not requiring a court appearance don&apos;t count.)
        </p>

        <div className="mb-4 flex gap-2">
          <button
            type="button"
            onClick={() => setDisclosure(false)}
            className={cn(
              'border px-6 py-2 font-body text-sm transition-colors',
              disclosure === false
                ? 'border-ink bg-ink text-paper'
                : 'border-line-strong bg-paper text-ink hover:bg-paper-3'
            )}
          >
            No
          </button>
          <button
            type="button"
            onClick={() => setDisclosure(true)}
            className={cn(
              'border px-6 py-2 font-body text-sm transition-colors',
              disclosure === true
                ? 'border-ink bg-ink text-paper'
                : 'border-line-strong bg-paper text-ink hover:bg-paper-3'
            )}
          >
            Yes
          </button>
        </div>

        {disclosure === true && (
          <div className="mt-4">
            <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
              Please explain
            </label>
            <textarea
              value={disclosureDetails}
              onChange={(e) => setDisclosureDetails(e.target.value.slice(0, 1000))}
              rows={3}
              placeholder="What happened, when, and how it's resolved."
              className="w-full resize-none border border-line-strong bg-paper p-3 font-body text-sm text-ink placeholder:text-ink-faint focus:border-ink focus:outline-none"
            />
            <p className="mt-2 font-mono text-[10px] text-ink-muted">
              Honesty here doesn&apos;t automatically disqualify you. Hiding it does.
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-line pt-8">
        <div className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
          Step 04 of 07
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
