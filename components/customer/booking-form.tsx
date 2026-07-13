'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SectionLabel } from '@/components/avanti/section-label';
import { toast } from '@/components/ui/sonner';
import { PriceQuoteCard } from './price-quote-card';
import { cn } from '@/lib/utils/cn';

/**
 * BookingForm — configure engagement + get live price + book.
 *
 * The two-column layout on desktop puts inputs on the left and the
 * price quote on the right, updating live as the customer changes
 * values. On mobile everything stacks.
 */

export interface BookingFormProps {
  driverId: string;
  driverName: string;
  availableClasses: string[]; // driver's vehicle_class_experience
}

type Quote = {
  quoteId: string;
  currency: string;
  base: number;
  overtime: number;
  subtotal: number;
  vat: number;
  customerTotal: number;
  expiresAt: string;
  breakdown: {
    unit: 'hour' | 'day';
    unitCount: number;
    unitPrice: number;
    overtimeHours: number;
    overtimeMultiplier: number;
  };
};

export function BookingForm({ driverId, driverName, availableClasses }: BookingFormProps) {
  const router = useRouter();
  const [engagementType, setEngagementType] = useState<'hourly' | 'full_day'>('hourly');
  const [vehicleClass, setVehicleClass] = useState<string>(availableClasses[0] ?? 'sedan');
  const [startsAt, setStartsAt] = useState<string>(() => {
    const t = new Date(Date.now() + 60 * 60 * 1000);
    t.setMinutes(0, 0, 0);
    return t.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
  });
  const [durationHours, setDurationHours] = useState<number>(3);
  const [pickupLine, setPickupLine] = useState('');
  const [instructions, setInstructions] = useState('');

  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [booking, setBooking] = useState(false);

  const canQuote = Boolean(vehicleClass) && durationHours > 0;
  const canBook = quote !== null && pickupLine.trim().length >= 3;

  const fetchQuote = async () => {
    setQuoting(true);
    setQuote(null);
    try {
      const res = await fetch('/api/customer/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverId,
          engagementType,
          vehicleClass,
          startsAt: new Date(startsAt).toISOString(),
          durationHours: engagementType === 'full_day' ? Math.max(8, durationHours) : durationHours,
        }),
      });
      const body = (await res.json()) as Quote & { error?: string; message?: string };
      if (!res.ok) {
        toast.error(body.message ?? body.error ?? 'Could not price this booking');
        return;
      }
      setQuote(body);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Quote failed');
    } finally {
      setQuoting(false);
    }
  };

  const book = async () => {
    if (!quote) return;
    setBooking(true);
    try {
      const res = await fetch('/api/customer/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteId: quote.quoteId,
          pickupAddress: { line: pickupLine.trim() },
          specialInstructions: instructions.trim() || undefined,
        }),
      });
      const body = (await res.json()) as {
        engagementId?: string;
        authorizationUrl?: string;
        mock?: boolean;
        error?: string;
        message?: string;
      };
      if (!res.ok || !body.authorizationUrl) {
        toast.error(body.message ?? body.error ?? 'Booking failed');
        return;
      }
      if (body.mock) {
        toast('Redirecting to mock payment…');
      }
      window.location.href = body.authorizationUrl;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Booking failed');
      setBooking(false);
    }
  };

  const field =
    'mt-2 w-full border border-line-strong bg-paper px-3 py-2 font-body text-sm text-ink outline-none focus:border-ink';

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Left column — inputs */}
      <div className="space-y-6">
        <div>
          <SectionLabel>Engagement type</SectionLabel>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {(
              [
                { v: 'hourly' as const, label: 'By the hour', hint: 'Minimum 2 hours' },
                { v: 'full_day' as const, label: 'Full day', hint: '8-hour day' },
              ] as const
            ).map((opt) => {
              const selected = engagementType === opt.v;
              return (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => {
                    setEngagementType(opt.v);
                    setQuote(null);
                    if (opt.v === 'full_day') setDurationHours(8);
                  }}
                  className={cn(
                    'border p-3 text-left transition-colors',
                    selected
                      ? 'border-ink bg-ink text-paper'
                      : 'border-line-strong bg-paper-2 text-ink hover:bg-paper-3'
                  )}
                >
                  <div className="font-body text-sm">{opt.label}</div>
                  <div
                    className={cn(
                      'mt-0.5 font-mono text-[10px] uppercase tracking-wider',
                      selected ? 'text-paper/70' : 'text-ink-muted'
                    )}
                  >
                    {opt.hint}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <Label htmlFor="vehicleClass">Vehicle class</Label>
          <select
            id="vehicleClass"
            className={field}
            value={vehicleClass}
            onChange={(e) => {
              setVehicleClass(e.target.value);
              setQuote(null);
            }}
          >
            {availableClasses.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="startsAt">Start</Label>
            <Input
              id="startsAt"
              type="datetime-local"
              className="mt-2"
              value={startsAt}
              onChange={(e) => {
                setStartsAt(e.target.value);
                setQuote(null);
              }}
            />
          </div>
          <div>
            <Label htmlFor="duration">
              {engagementType === 'full_day' ? 'Days' : 'Hours'}
            </Label>
            <Input
              id="duration"
              type="number"
              min={1}
              max={engagementType === 'full_day' ? 30 : 24}
              className="mt-2"
              value={engagementType === 'full_day' ? Math.ceil(durationHours / 8) : durationHours}
              onChange={(e) => {
                const v = Number(e.target.value) || 1;
                setDurationHours(engagementType === 'full_day' ? v * 8 : v);
                setQuote(null);
              }}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="pickup">Pickup address</Label>
          <Input
            id="pickup"
            className="mt-2"
            placeholder="12 Marina Road, Ikoyi, Lagos"
            value={pickupLine}
            onChange={(e) => setPickupLine(e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="instructions">Special instructions · optional</Label>
          <Textarea
            id="instructions"
            className="mt-2"
            placeholder="Please wear a suit; may include a stop at the airport"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
          />
        </div>

        <Button variant="secondary" onClick={fetchQuote} disabled={!canQuote || quoting}>
          {quoting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {quoting ? 'Pricing…' : quote ? 'Update quote' : 'Get quote'}
        </Button>
      </div>

      {/* Right column — quote + book */}
      <div className="space-y-6">
        {quote ? (
          <>
            <PriceQuoteCard
              currency={quote.currency}
              base={quote.base}
              overtime={quote.overtime}
              vat={quote.vat}
              customerTotal={quote.customerTotal}
              breakdown={quote.breakdown}
              expiresAt={quote.expiresAt}
            />
            <Button size="lg" onClick={book} disabled={!canBook || booking} className="w-full">
              {booking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {booking ? 'Redirecting…' : `Book ${driverName}`}
            </Button>
            <p className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
              You&apos;ll be sent to a secure payment page. The engagement is only confirmed after
              payment succeeds.
            </p>
          </>
        ) : (
          <div className="border border-dashed border-line-strong bg-paper-2 px-6 py-16 text-center">
            <p className="font-body text-sm text-ink-muted">
              Set your booking details on the left, then get a live quote.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
