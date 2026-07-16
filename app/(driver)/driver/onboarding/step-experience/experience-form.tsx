'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';
import type { ExperienceData } from '@/lib/onboarding/state';
import { cn } from '@/lib/utils/cn';

const VEHICLE_CLASSES = [
  { code: 'sedan', label: 'Sedan' },
  { code: 'suv', label: 'SUV' },
  { code: 'crossover', label: 'Crossover' },
  { code: 'minivan', label: 'Minivan' },
  { code: 'bus', label: 'Bus' },
  { code: 'lorry', label: 'Lorry / Truck' },
  { code: 'luxury', label: 'Luxury vehicle' },
  { code: 'armoured', label: 'Armoured vehicle' },
];

const TRANSMISSIONS = [
  { code: 'automatic', label: 'Automatic' },
  { code: 'manual', label: 'Manual' },
];

const LANGUAGES = [
  { code: 'English', label: 'English' },
  { code: 'Yoruba', label: 'Yoruba' },
  { code: 'Igbo', label: 'Igbo' },
  { code: 'Hausa', label: 'Hausa' },
  { code: 'Pidgin', label: 'Pidgin' },
  { code: 'French', label: 'French' },
];

export function ExperienceStepForm({ initialData }: { initialData: ExperienceData }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const [years, setYears] = useState<number | ''>(initialData.years_experience ?? '');
  const [vehicles, setVehicles] = useState<string[]>(initialData.vehicle_classes ?? []);
  const [transmissions, setTransmissions] = useState<string[]>(
    initialData.transmission_experience ?? []
  );
  const [languages, setLanguages] = useState<string[]>(
    initialData.languages ?? ['English']
  );
  const [canDriveAtNight, setCanDriveAtNight] = useState<boolean | null>(
    initialData.can_drive_at_night ?? null
  );
  const [hasSmartphone, setHasSmartphone] = useState<boolean | null>(
    initialData.has_smartphone ?? null
  );
  const [radiusKm, setRadiusKm] = useState<number | ''>(
    initialData.service_radius_km ?? 25
  );

  const toggle = (setter: (fn: (prev: string[]) => string[]) => void, value: string) => {
    setter((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  const canContinue =
    typeof years === 'number' &&
    years >= 1 &&
    vehicles.length > 0 &&
    transmissions.length > 0 &&
    languages.length > 0 &&
    canDriveAtNight !== null &&
    hasSmartphone !== null &&
    typeof radiusKm === 'number' &&
    radiusKm >= 5;

  const saveAndContinue = async () => {
    if (!canContinue) {
      toast.error('Please answer every field to continue.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/driver/onboarding/save-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: 'experience',
          data: {
            years_experience: years,
            vehicle_classes: vehicles,
            transmission_experience: transmissions,
            languages,
            can_drive_at_night: canDriveAtNight,
            has_smartphone: hasSmartphone,
            service_radius_km: radiusKm,
          },
        }),
      });
      const body = (await res.json()) as { saved?: boolean; error?: string; message?: string };
      if (!res.ok) {
        toast.error(body.message ?? body.error ?? 'Save failed');
        return;
      }
      router.push('/driver/onboarding/step-availability');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  };

  const pillClass = (selected: boolean) =>
    cn(
      'border px-4 py-2 font-body text-sm transition-colors',
      selected
        ? 'border-ink bg-ink text-paper'
        : 'border-line-strong bg-paper text-ink hover:bg-paper-3'
    );

  const yesNoClass = (selected: boolean) =>
    cn(
      'border px-6 py-2 font-body text-sm transition-colors',
      selected
        ? 'border-ink bg-ink text-paper'
        : 'border-line-strong bg-paper text-ink hover:bg-paper-3'
    );

  return (
    <div>
      {/* Years */}
      <div className="mb-8">
        <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
          Years of professional driving experience
        </label>
        <Input
          type="number"
          min={0}
          max={60}
          value={years}
          onChange={(e) => setYears(e.target.value ? parseInt(e.target.value, 10) : '')}
          placeholder="8"
          className="max-w-xs font-mono"
          autoFocus
        />
        <p className="mt-2 font-mono text-[10px] text-ink-muted">
          Paid work only — commuting doesn&apos;t count
        </p>
      </div>

      {/* Vehicle classes */}
      <div className="mb-8">
        <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
          Vehicle classes you&apos;ve driven professionally · pick all that apply
        </label>
        <div className="flex flex-wrap gap-2">
          {VEHICLE_CLASSES.map((v) => (
            <button
              key={v.code}
              type="button"
              onClick={() => toggle(setVehicles, v.code)}
              className={pillClass(vehicles.includes(v.code))}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Transmission */}
      <div className="mb-8">
        <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
          Transmissions you can drive
        </label>
        <div className="flex flex-wrap gap-2">
          {TRANSMISSIONS.map((t) => (
            <button
              key={t.code}
              type="button"
              onClick={() => toggle(setTransmissions, t.code)}
              className={pillClass(transmissions.includes(t.code))}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Languages */}
      <div className="mb-8">
        <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
          Languages you speak
        </label>
        <div className="flex flex-wrap gap-2">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => toggle(setLanguages, l.code)}
              className={pillClass(languages.includes(l.code))}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {/* Night driving */}
      <div className="mb-8">
        <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
          Are you comfortable driving at night?
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setCanDriveAtNight(false)}
            className={yesNoClass(canDriveAtNight === false)}
          >
            No
          </button>
          <button
            type="button"
            onClick={() => setCanDriveAtNight(true)}
            className={yesNoClass(canDriveAtNight === true)}
          >
            Yes
          </button>
        </div>
      </div>

      {/* Smartphone */}
      <div className="mb-8">
        <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
          Do you have a smartphone with mobile data?
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setHasSmartphone(false)}
            className={yesNoClass(hasSmartphone === false)}
          >
            No
          </button>
          <button
            type="button"
            onClick={() => setHasSmartphone(true)}
            className={yesNoClass(hasSmartphone === true)}
          >
            Yes
          </button>
        </div>
        <p className="mt-2 font-mono text-[10px] text-ink-muted">
          Required for receiving bookings and updates
        </p>
      </div>

      {/* Service radius */}
      <div className="mb-10">
        <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
          Service radius · kilometres from your home
        </label>
        <Input
          type="number"
          min={5}
          max={200}
          value={radiusKm}
          onChange={(e) => setRadiusKm(e.target.value ? parseInt(e.target.value, 10) : '')}
          placeholder="25"
          className="max-w-xs font-mono"
        />
        <p className="mt-2 font-mono text-[10px] text-ink-muted">
          How far you&apos;re willing to travel for a booking
        </p>
      </div>

      <div className="flex items-center justify-between border-t border-line pt-8">
        <div className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
          Step 05 of 07
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
