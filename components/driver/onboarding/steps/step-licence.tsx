'use client';

import type { OnboardingData } from '../wizard';
import { SectionLabel } from '@/components/avanti/section-label';
import { Input } from '@/components/ui/input';
import { DocumentUpload } from '../document-upload';
import { cn } from '@/lib/utils/cn';

/**
 * Licence step.
 *
 * Nigerian FRSC licence classes. Photo upload + number + class + validity dates.
 */

const LICENCE_CLASSES: { value: string; label: string; help: string }[] = [
  { value: 'A', label: 'A', help: 'Motorcycles' },
  { value: 'B', label: 'B', help: 'Cars, up to 3.5 tonnes' },
  { value: 'C', label: 'C', help: 'Vans, up to 7.5 tonnes' },
  { value: 'D', label: 'D', help: 'Heavy vehicles' },
  { value: 'E', label: 'E', help: 'Buses' },
  { value: 'F', label: 'F', help: 'Specialised' },
];

export function StepLicence({
  data,
  onUpdate,
}: {
  data: OnboardingData;
  onUpdate: (patch: OnboardingData) => void;
}) {
  const licence = data.licence ?? {};
  const set = (patch: Partial<typeof licence>) => onUpdate({ licence: patch });

  // Rough validity check for the banner
  const expiresDate = licence.expires_date ? new Date(licence.expires_date) : null;
  const now = new Date();
  const expiresSoon = expiresDate && expiresDate.getTime() - now.getTime() < 90 * 86400 * 1000;
  const expired = expiresDate && expiresDate < now;

  return (
    <div className="space-y-14">
      <p className="max-w-2xl font-display text-2xl leading-snug text-ink md:text-3xl">
        Now the <em className="italic">driving licence.</em>
      </p>

      <p className="max-w-2xl font-body leading-relaxed text-ink">
        A clear photo of your Nigerian FRSC licence, plus the number and validity dates.
        Class B is the minimum for most passenger bookings; higher classes unlock heavier
        vehicles.
      </p>

      {/* 01 · Upload */}
      <div>
        <SectionLabel>01 · Photo of your licence</SectionLabel>
        <p className="mt-3 max-w-2xl font-body text-sm leading-relaxed text-ink-muted">
          Both sides if you have them. Make sure the licence number and expiry date are
          legible.
        </p>
        <div className="mt-6">
          <DocumentUpload
            kind="licence"
            currentDocumentId={licence.document_id}
            onUploaded={(id: string) => set({ document_id: id })}
          />
        </div>
      </div>

      {/* 02 · Number */}
      <div>
        <SectionLabel>02 · Licence number</SectionLabel>
        <label className="mt-6 block max-w-md">
          <span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
            As printed on the card
          </span>
          <Input
            value={licence.licence_number ?? ''}
            onChange={(e) => set({ licence_number: e.target.value })}
            className="font-mono"
            placeholder="AKW05432AA23"
          />
        </label>
      </div>

      {/* 03 · Class */}
      <div>
        <SectionLabel>03 · Licence class</SectionLabel>
        <p className="mt-3 max-w-2xl font-body text-sm leading-relaxed text-ink-muted">
          The class printed on your licence. Most professional drivers hold B or higher.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-3 md:grid-cols-6">
          {LICENCE_CLASSES.map((c) => {
            const active = licence.licence_class === c.value;
            return (
              <button
                key={c.value}
                onClick={() => set({ licence_class: c.value })}
                className={cn(
                  'flex flex-col items-start border p-4 text-left transition-colors',
                  active
                    ? 'border-ink bg-ink text-paper'
                    : 'border-line-strong bg-paper text-ink hover:bg-paper-3'
                )}
              >
                <div className="font-display text-2xl leading-none">{c.label}</div>
                <div
                  className={cn(
                    'mt-2 font-mono text-[10px] uppercase tracking-wider',
                    active ? 'text-paper/70' : 'text-ink-muted'
                  )}
                >
                  {c.help}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 04 · Country */}
      <div>
        <SectionLabel>04 · Country of issue</SectionLabel>
        <label className="mt-6 block max-w-md">
          <span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
            Where the licence was issued
          </span>
          <Input
            value={licence.licence_country ?? 'Nigeria'}
            onChange={(e) => set({ licence_country: e.target.value })}
          />
        </label>
      </div>

      {/* 05 · Issued */}
      <div>
        <SectionLabel>05 · Issued</SectionLabel>
        <label className="mt-6 block max-w-xs">
          <Input
            type="date"
            value={licence.issued_date ?? ''}
            onChange={(e) => set({ issued_date: e.target.value })}
            className="font-mono"
          />
        </label>
      </div>

      {/* 06 · Expires */}
      <div>
        <SectionLabel>06 · Expires</SectionLabel>
        <label className="mt-6 block max-w-xs">
          <Input
            type="date"
            value={licence.expires_date ?? ''}
            onChange={(e) => set({ expires_date: e.target.value })}
            className="font-mono"
          />
        </label>
      </div>

      {/* Adaptive banner */}
      {expired ? (
        <div className="border-l-2 border-oxblood bg-paper-2 px-6 py-5">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-oxblood">
            Expired
          </div>
          <p className="mt-2 max-w-xl font-body text-sm leading-relaxed text-ink">
            The licence you&apos;ve entered has expired. We can&apos;t verify drivers with
            expired credentials. Please renew at FRSC before continuing.
          </p>
        </div>
      ) : expiresSoon ? (
        <div className="border-l-2 border-brass bg-brass-soft px-6 py-5">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-brass">
            Renewal due
          </div>
          <p className="mt-2 max-w-xl font-body text-sm leading-relaxed text-ink">
            Your licence expires within 90 days. You can still submit, but we&apos;ll ask
            you to update it soon after verification.
          </p>
        </div>
      ) : (
        <div className="border-l-2 border-brass bg-brass-soft px-6 py-5">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-brass">
            A note on classes
          </div>
          <p className="mt-2 max-w-xl font-body text-sm leading-relaxed text-ink">
            Class B is enough for the standard bookings you&apos;ll see on Avanti. Higher
            classes let you take heavier vehicles — corporate fleets, event buses,
            specialised assignments.
          </p>
        </div>
      )}
    </div>
  );
}
