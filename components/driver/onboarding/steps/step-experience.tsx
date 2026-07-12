'use client';

import { SectionLabel } from '@/components/avanti/section-label';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils/cn';
import type { StepProps } from '../wizard';

const LANGUAGES = ['English', 'Yoruba', 'Igbo', 'Hausa', 'Pidgin', 'French'];
const VEHICLE_CLASSES = ['sedan', 'suv', 'executive', 'van', 'pickup'];
const TRANSMISSIONS = ['automatic', 'manual'];

export function StepExperience({ data, update }: StepProps) {
  const toggle = (
    field: 'languages' | 'vehicleClasses' | 'transmissionTypes',
    value: string
  ) => {
    const current = data.experience[field] ?? [];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    update({ experience: { [field]: next } });
  };

  const isSelected = (
    field: 'languages' | 'vehicleClasses' | 'transmissionTypes',
    value: string
  ) => (data.experience[field] ?? []).includes(value);

  return (
    <div className="space-y-6">
      <div>
        <Label htmlFor="years">Years driving professionally</Label>
        <Input
          id="years"
          type="number"
          min={0}
          max={60}
          className="mt-2 max-w-[8rem]"
          value={data.experience.yearsExperience ?? ''}
          onChange={(e) =>
            update({ experience: { yearsExperience: Number(e.target.value) || 0 } })
          }
        />
      </div>

      <ChipSection
        label="Languages"
        options={LANGUAGES}
        isSelected={(v) => isSelected('languages', v)}
        onToggle={(v) => toggle('languages', v)}
      />

      <ChipSection
        label="Vehicle classes you're comfortable with"
        options={VEHICLE_CLASSES}
        isSelected={(v) => isSelected('vehicleClasses', v)}
        onToggle={(v) => toggle('vehicleClasses', v)}
      />

      <ChipSection
        label="Transmissions"
        options={TRANSMISSIONS}
        isSelected={(v) => isSelected('transmissionTypes', v)}
        onToggle={(v) => toggle('transmissionTypes', v)}
      />

      <div>
        <Label htmlFor="home-city">Home city</Label>
        <Input
          id="home-city"
          className="mt-2"
          placeholder="Lagos"
          value={data.experience.homeBaseCity ?? ''}
          onChange={(e) => update({ experience: { homeBaseCity: e.target.value } })}
        />
      </div>

      <div>
        <Label htmlFor="radius">Service radius · km</Label>
        <Input
          id="radius"
          type="number"
          min={1}
          max={500}
          className="mt-2 max-w-[8rem]"
          value={data.experience.serviceRadiusKm ?? ''}
          onChange={(e) =>
            update({ experience: { serviceRadiusKm: Number(e.target.value) || undefined } })
          }
        />
        <p className="mt-1 font-body text-xs text-ink-muted">
          How far from your home city you&apos;re willing to travel.
        </p>
      </div>

      <div>
        <Label htmlFor="bio">Short bio · optional</Label>
        <Textarea
          id="bio"
          className="mt-2"
          placeholder="Six years chauffeuring in Lagos. Comfortable with executive clients, night shifts, and long-distance trips."
          value={data.experience.bio ?? ''}
          onChange={(e) => update({ experience: { bio: e.target.value } })}
        />
        <p className="mt-1 font-body text-xs text-ink-muted">
          Customers see this on your profile. Keep it professional.
        </p>
      </div>
    </div>
  );
}

function ChipSection({
  label,
  options,
  isSelected,
  onToggle,
}: {
  label: string;
  options: string[];
  isSelected: (v: string) => boolean;
  onToggle: (v: string) => void;
}) {
  return (
    <div>
      <SectionLabel>{label}</SectionLabel>
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((o) => {
          const selected = isSelected(o);
          return (
            <button
              key={o}
              type="button"
              onClick={() => onToggle(o)}
              className={cn(
                'border px-3 py-1.5 font-body text-sm capitalize transition-colors',
                selected
                  ? 'border-ink bg-ink text-paper'
                  : 'border-line-strong bg-paper-2 text-ink hover:bg-paper-3'
              )}
            >
              {o}
            </button>
          );
        })}
      </div>
    </div>
  );
}
