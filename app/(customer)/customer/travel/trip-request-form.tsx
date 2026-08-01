'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Send, Check } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

/**
 * TripRequestForm — customer describes a specific out-of-state / inter-city
 * trip. This is a REQUEST, not a booking: it lands in the admin queue, where
 * ops matches a driver and sets the price + conditions by hand. No pricing is
 * shown here.
 */

type Transmission = 'automatic' | 'manual';
type TripType = 'round_trip' | 'one_way';
type Accommodation = 'customer_arranges' | 'include_in_price';
type Contact = 'whatsapp' | 'phone' | 'email';

const VEHICLE_CLASSES = ['sedan', 'suv', 'executive', 'van', 'pickup'] as const;

export function TripRequestForm({ defaultContact }: { defaultContact: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const [tripType, setTripType] = useState<TripType>('round_trip');
  const [origin, setOrigin] = useState('Lagos');
  const [destinations, setDestinations] = useState('');
  const [departureAt, setDepartureAt] = useState('');
  const [returnAt, setReturnAt] = useState('');
  const [days, setDays] = useState('');
  const [nights, setNights] = useState('');
  const [vehicleDescription, setVehicleDescription] = useState('');
  const [vehicleClass, setVehicleClass] = useState<(typeof VEHICLE_CLASSES)[number]>('sedan');
  const [transmission, setTransmission] = useState<Transmission>('automatic');
  const [passengers, setPassengers] = useState('1');
  const [dailyUsage, setDailyUsage] = useState('');
  const [accommodation, setAccommodation] = useState<Accommodation>('customer_arranges');
  const [tierPreference, setTierPreference] = useState('');
  const [specialRequirements, setSpecialRequirements] = useState('');
  const [purpose, setPurpose] = useState('');
  const [pickupAddress, setPickupAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [contactMethod, setContactMethod] = useState<Contact>('whatsapp');
  const [contactDetail, setContactDetail] = useState(defaultContact);

  const submit = async () => {
    const destList = destinations
      .split(',')
      .map((d) => d.trim())
      .filter(Boolean);

    if (!origin.trim()) return toast.error('Where are you starting from?');
    if (destList.length === 0) return toast.error('Where are you going?');
    if (!departureAt) return toast.error('When do you leave?');
    if (tripType === 'round_trip' && !returnAt) return toast.error('When do you return?');
    if (!vehicleDescription.trim()) return toast.error('Tell us the vehicle the driver will drive.');
    if (!pickupAddress.trim()) return toast.error('We need a pickup address.');
    if (!contactDetail.trim()) return toast.error('We need a way to reach you.');

    setBusy(true);
    try {
      const res = await fetch('/api/customer/trip-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripType,
          originCity: origin.trim(),
          destinations: destList,
          departureAt,
          returnAt: tripType === 'round_trip' ? returnAt : null,
          days: days ? Number(days) : null,
          nights: nights ? Number(nights) : 0,
          vehicleDescription: vehicleDescription.trim(),
          vehicleClass,
          transmission,
          passengers: Number(passengers) || 1,
          dailyUsage: dailyUsage.trim() || null,
          accommodation,
          tierPreference: tierPreference || null,
          specialRequirements: specialRequirements.trim() || null,
          purpose: purpose.trim() || null,
          pickupAddress: pickupAddress.trim(),
          notes: notes.trim() || null,
          contactMethod,
          contactDetail: contactDetail.trim(),
        }),
      });
      const body = (await res.json()) as { ok?: boolean; error?: string; message?: string };
      if (!res.ok) {
        toast.error(body.message ?? body.error ?? 'Could not submit your request');
        return;
      }
      setSent(true);
      toast.success('Request sent');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not submit your request');
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <div className="rounded-2xl border border-admin-green/30 bg-admin-green-soft p-8 shadow-admin">
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-admin-green-soft px-2 py-0.5 font-body text-[11px] font-medium uppercase tracking-wide text-admin-green-text">
          <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
          Request received
        </div>
        <p className="max-w-2xl font-display text-2xl font-semibold leading-snug tracking-tight text-admin-text md:text-3xl">
          Thank you. We&apos;re on it.
        </p>
        <p className="mt-4 max-w-xl font-body leading-relaxed text-admin-text-muted">
          Our team will match you with the right driver and send a quote with the price and
          conditions to <span className="font-medium text-admin-text">{contactDetail}</span>.
          Usually within one business day.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* The trip */}
      <Section title="The trip">
        <Field label="Trip type">
          <Segmented
            options={[
              { value: 'round_trip', label: 'Round trip' },
              { value: 'one_way', label: 'One way' },
            ]}
            value={tripType}
            onChange={(v) => setTripType(v as TripType)}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="From">
            <input className={inputClass} value={origin} onChange={(e) => setOrigin(e.target.value)} placeholder="Lagos" />
          </Field>
          <Field label="To — city, or several separated by commas">
            <input
              className={inputClass}
              value={destinations}
              onChange={(e) => setDestinations(e.target.value)}
              placeholder="Ibadan, Osogbo"
            />
          </Field>
          <Field label="Departure">
            <input type="datetime-local" className={inputClass} value={departureAt} onChange={(e) => setDepartureAt(e.target.value)} />
          </Field>
          {tripType === 'round_trip' && (
            <Field label="Return">
              <input type="datetime-local" className={inputClass} value={returnAt} onChange={(e) => setReturnAt(e.target.value)} />
            </Field>
          )}
          <Field label="Days away">
            <input type="number" min={1} className={inputClass} value={days} onChange={(e) => setDays(e.target.value)} placeholder="3" />
          </Field>
          <Field label="Nights the driver stays over">
            <input type="number" min={0} className={inputClass} value={nights} onChange={(e) => setNights(e.target.value)} placeholder="2" />
          </Field>
        </div>
      </Section>

      {/* Vehicle & driving */}
      <Section title="Your vehicle & the driving">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Vehicle (make & model)">
            <input className={inputClass} value={vehicleDescription} onChange={(e) => setVehicleDescription(e.target.value)} placeholder="Toyota Highlander 2021" />
          </Field>
          <Field label="Vehicle class">
            <select className={inputClass} value={vehicleClass} onChange={(e) => setVehicleClass(e.target.value as (typeof VEHICLE_CLASSES)[number])}>
              {VEHICLE_CLASSES.map((c) => (
                <option key={c} value={c} className="capitalize">
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Transmission">
            <Segmented
              options={[
                { value: 'automatic', label: 'Automatic' },
                { value: 'manual', label: 'Manual' },
              ]}
              value={transmission}
              onChange={(v) => setTransmission(v as Transmission)}
            />
          </Field>
          <Field label="Passengers">
            <input type="number" min={0} className={inputClass} value={passengers} onChange={(e) => setPassengers(e.target.value)} />
          </Field>
        </div>
        <Field label="How will the driver be used each day? (optional)">
          <textarea
            className={textareaClass}
            rows={2}
            value={dailyUsage}
            onChange={(e) => setDailyUsage(e.target.value)}
            placeholder="e.g. With us all day, or drop-off in the morning then free until evening."
          />
        </Field>
        <Field label="Driver's accommodation & meals while away">
          <Segmented
            options={[
              { value: 'customer_arranges', label: "I'll arrange it" },
              { value: 'include_in_price', label: 'Include it in the price' },
            ]}
            value={accommodation}
            onChange={(v) => setAccommodation(v as Accommodation)}
          />
        </Field>
      </Section>

      {/* Requirements */}
      <Section title="Requirements">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Driver level (optional)">
            <select className={inputClass} value={tierPreference} onChange={(e) => setTierPreference(e.target.value)}>
              <option value="">No preference</option>
              <option value="standard">Standard</option>
              <option value="professional">Professional</option>
              <option value="executive">Executive</option>
            </select>
          </Field>
          <Field label="Purpose (optional)">
            <input className={inputClass} value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="Business / family / event" />
          </Field>
        </div>
        <Field label="Languages or special needs (optional)">
          <textarea
            className={textareaClass}
            rows={2}
            value={specialRequirements}
            onChange={(e) => setSpecialRequirements(e.target.value)}
            placeholder="e.g. Yoruba-speaking, comfortable on long highway stretches, early starts, child seat."
          />
        </Field>
      </Section>

      {/* Logistics & contact */}
      <Section title="Logistics & contact">
        <Field label="Pickup address / area">
          <input className={inputClass} value={pickupAddress} onChange={(e) => setPickupAddress(e.target.value)} placeholder="e.g. Lekki Phase 1, Lagos" />
        </Field>
        <Field label="Anything else we should know? (optional)">
          <textarea className={textareaClass} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="How should we reach you?">
            <Segmented
              options={[
                { value: 'whatsapp', label: 'WhatsApp' },
                { value: 'phone', label: 'Phone' },
                { value: 'email', label: 'Email' },
              ]}
              value={contactMethod}
              onChange={(v) => setContactMethod(v as Contact)}
            />
          </Field>
          <Field label={contactMethod === 'email' ? 'Your email' : 'Your phone number'}>
            <input className={inputClass} value={contactDetail} onChange={(e) => setContactDetail(e.target.value)} placeholder={contactMethod === 'email' ? 'you@example.com' : '+234...'} />
          </Field>
        </div>
      </Section>

      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={submit}
          disabled={busy}
          className="inline-flex min-w-[220px] items-center justify-center gap-2 rounded-xl bg-admin-green px-5 py-3 font-body text-sm font-medium text-admin-navy-2 shadow-admin-sm transition-all hover:brightness-95 disabled:opacity-60"
        >
          {busy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
              Sending…
            </>
          ) : (
            <>
              <Send className="h-4 w-4" strokeWidth={2} />
              Send request
            </>
          )}
        </button>
        <p className="font-body text-[12px] text-admin-text-muted">No charge yet — we&apos;ll quote first.</p>
      </div>
    </div>
  );
}

const inputClass =
  'w-full rounded-xl border border-admin-border bg-admin-card px-3 py-2.5 font-body text-sm text-admin-text shadow-admin-sm outline-none placeholder:text-admin-text-muted focus:border-admin-green focus:ring-2 focus:ring-admin-green/20';
const textareaClass = `${inputClass} resize-none leading-relaxed`;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-admin-border bg-admin-card p-5 shadow-admin-sm sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        <span className="h-4 w-1 rounded-full bg-admin-green" aria-hidden />
        <h2 className="font-display text-[15px] font-semibold tracking-tight text-admin-text">{title}</h2>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block font-body text-[12px] font-medium text-admin-text">{label}</span>
      {children}
    </label>
  );
}

function Segmented({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={
            'rounded-xl border px-4 py-2 font-body text-sm font-medium transition-all ' +
            (value === o.value
              ? 'border-admin-green bg-admin-green-soft text-admin-green-text shadow-admin-sm'
              : 'border-admin-border bg-admin-bg text-admin-text hover:border-admin-green/40')
          }
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
