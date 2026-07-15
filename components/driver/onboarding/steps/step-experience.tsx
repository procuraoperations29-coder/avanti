'use client';

import type { OnboardingData } from '../wizard';
import { SectionLabel } from '@/components/avanti/section-label';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils/cn';

/**
 * Experience step.
 *
 * Years, vehicle classes, transmissions, languages, bio, service radius.
 * Uses pill-toggle buttons for multi-select instead of dropdowns — feels
 * more considered and mobile-friendly.
 */

const VEHICLE_CLASSES = [
  { value: 'sedan', label: 'Sedan' },
  { value: 'suv', label: 'SUV' },
  { value: 'executive', label: 'Executive' },
  { value: 'van', label: 'Van' },
  { value: 'pickup', label: 'Pickup' },
];

const TRANSMISSIONS = [
  { value: 'automatic', label: 'Automatic' },
  { value: 'manual', label: 'Manual' },
];

const LANGUAGES = [
  'English',
  'Yoruba',
  'Igbo',
  'Hausa',
  'Pidgin',
  'French',
];

function toggle<T>(list: T[] | undefined, item: T): T[] {
  const set = new Set(list ?? []);
  if (set.has(item)) set.delete(item);
  else set.add(item);
  return Array.from(set);
}

export function StepExperience({
  data,
  onUpdate,
}: {
  data: OnboardingData;
  onUpdate: (patch: OnboardingData) => void;
}) {
  const exp = data.experience ?? {};
  const set = (patch: Partial<typeof exp>) => onUpdate({ experience: patch });

  const bioLen = (exp.bio ?? '').length;

  return (
    <div className="space-y-14">
      <p className="max-w-2xl font-display text-2xl leading-snug text-ink md:text-3xl">
        Tell us about <em className="italic">your work.</em>
      </p>

      <p className="max-w-2xl font-body leading-relaxed text-ink">
        This is what customers see on your dossier. Be honest — the tier you&apos;re placed
        in depends on it, and misrepresenting experience is grounds for removal.
      </p>

      {/* 01 · Years */}
      <div>
        <SectionLabel>01 · Years of professional driving</SectionLabel>
        <p className="mt-3 max-w-2xl font-body text-sm leading-relaxed text-ink-muted">
          How long you&apos;ve been driving for hire — private, corporate, or otherwise.
          Personal car years don&apos;t count.
        </p>
        <label className="mt-6 block max-w-xs">
          <Input
            type="number"
            min={0}
            max={60}
            value={exp.years_experience ?? ''}
            onChange={(e) =>
              set({
                years_experience: e.target.value ? Number(e.target.value) : undefined,
              })
            }
            className="font-mono text-lg"
            placeholder="6"
          />
        </label>
      </div>

      {/* 02 · Vehicle classes */}
      <div>
        <SectionLabel>02 · Vehicle classes you&apos;ve driven</SectionLabel>
        <p className="mt-3 max-w-2xl font-body text-sm leading-relaxed text-ink-muted">
          Select every class you have real experience with. Customers filter by these.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          {VEHICLE_CLASSES.map((v) => {
            const active = (exp.vehicle_class_experience ?? []).includes(v.value);
            return (
              <button
                key={v.value}
                onClick={() =>
                  set({
                    vehicle_class_experience: toggle(exp.vehicle_class_experience, v.value),
                  })
                }
                className={cn(
                  'border px-4 py-2 font-body text-sm transition-colors',
                  active
                    ? 'border-ink bg-ink text-paper'
                    : 'border-line-strong bg-paper text-ink hover:bg-paper-3'
                )}
              >
                {v.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 03 · Transmissions */}
      <div>
        <SectionLabel>03 · Transmissions you&apos;re confident with</SectionLabel>
        <div className="mt-6 flex flex-wrap gap-2">
          {TRANSMISSIONS.map((t) => {
            const active = (exp.transmission_experience ?? []).includes(t.value);
            return (
              <button
                key={t.value}
                onClick={() =>
                  set({
                    transmission_experience: toggle(exp.transmission_experience, t.value),
                  })
                }
                className={cn(
                  'border px-4 py-2 font-body text-sm transition-colors',
                  active
                    ? 'border-ink bg-ink text-paper'
                    : 'border-line-strong bg-paper text-ink hover:bg-paper-3'
                )}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 04 · Languages */}
      <div>
        <SectionLabel>04 · Languages you speak</SectionLabel>
        <p className="mt-3 max-w-2xl font-body text-sm leading-relaxed text-ink-muted">
          Any level. Customers filter by these — being able to converse with your
          passenger meaningfully expands your bookings.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          {LANGUAGES.map((l) => {
            const active = (exp.languages ?? []).includes(l);
            return (
              <button
                key={l}
                onClick={() =>
                  set({
                    languages: toggle(exp.languages, l),
                  })
                }
                className={cn(
                  'border px-4 py-2 font-body text-sm transition-colors',
                  active
                    ? 'border-ink bg-ink text-paper'
                    : 'border-line-strong bg-paper text-ink hover:bg-paper-3'
                )}
              >
                {l}
              </button>
            );
          })}
        </div>
      </div>

      {/* 05 · Bio */}
      <div>
        <SectionLabel>05 · Something about you</SectionLabel>
        <p className="mt-3 max-w-2xl font-body text-sm leading-relaxed text-ink-muted">
          One or two sentences — the kind of driving you&apos;ve done, the clients you&apos;ve
          served. This appears in your dossier as a pull quote.
        </p>
        <label className="mt-6 block max-w-2xl">
          <textarea
            value={exp.bio ?? ''}
            onChange={(e) => set({ bio: e.target.value.slice(0, 500) })}
            rows={4}
            placeholder="Six years chauffeuring in Lagos. Executive clients, night shifts, long-distance runs to Abuja."
            className="w-full resize-none border border-line-strong bg-paper p-3 font-body text-base leading-relaxed text-ink placeholder:text-ink-faint focus:border-ink focus:outline-none"
          />
          <div className="mt-2 flex items-baseline justify-between font-mono text-[10px] uppercase tracking-wider text-ink-muted">
            <span>Appears on your dossier as a quote</span>
            <span className={cn(bioLen > 450 ? 'text-oxblood' : '')}>{bioLen}/500</span>
          </div>
        </label>
      </div>

      {/* 06 · Radius */}
      <div>
        <SectionLabel>06 · Service radius</SectionLabel>
        <p className="mt-3 max-w-2xl font-body text-sm leading-relaxed text-ink-muted">
          How far from your address you&apos;re willing to travel for a booking. Lagos
          drivers typically choose 30-80 km.
        </p>
        <label className="mt-6 block max-w-xs">
          <div className="relative">
            <Input
              type="number"
              min={5}
              max={500}
              value={exp.service_radius_km ?? ''}
              onChange={(e) =>
                set({
                  service_radius_km: e.target.value ? Number(e.target.value) : undefined,
                })
              }
              className="pr-14 font-mono text-lg"
              placeholder="50"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-mono text-xs uppercase tracking-wider text-ink-muted">
              km
            </span>
          </div>
        </label>
      </div>

      {/* Banner about tiers */}
      <div className="border-l-2 border-brass bg-brass-soft px-6 py-5">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-brass">
          On tiers
        </div>
        <p className="mt-2 max-w-xl font-body text-sm leading-relaxed text-ink">
          Three years of documented experience minimum for the Professional tier. Five plus
          defensive-driving certification for Executive. You can grow into higher tiers
          later — your first tier is based on what you can show today.
        </p>
      </div>
    </div>
  );
}
