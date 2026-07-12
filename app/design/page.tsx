'use client';

import { useState } from 'react';
import { Users, FileCheck, Award, ShieldCheck, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { toast } from '@/components/ui/sonner';
import { SectionLabel } from '@/components/avanti/section-label';
import { Portrait } from '@/components/avanti/portrait';
import { TierBadge } from '@/components/avanti/tier-badge';
import { StampBadge } from '@/components/avanti/stamp-badge';
import { StepProgressBar } from '@/components/avanti/step-progress-bar';
import { EmptyState } from '@/components/avanti/empty-state';
import { ErrorState } from '@/components/avanti/error-state';
import { SpecRow } from '@/components/avanti/spec-row';

const ONBOARDING_STEPS = [
  'Details',
  'Identity',
  'Licence',
  'Background',
  'Vehicle',
  'Payout',
  'Review',
] as const;

/**
 * Design system reference. Not linked from anywhere — visit /design directly.
 */
export default function DesignPage() {
  const [step, setStep] = useState(2);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <div className="mb-12">
        <SectionLabel>Design system</SectionLabel>
        <h1 className="mt-3 font-display text-5xl leading-tight text-ink">
          <em className="italic">Avanti</em>, in one page.
        </h1>
        <p className="mt-3 max-w-xl font-body text-ink-muted">
          Primitives and composites. Not linked from anywhere; a reference for the visual language.
        </p>
      </div>

      {/* Colour palette */}
      <Section title="Palette">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Swatch name="Paper" cls="bg-paper" fg="text-ink" />
          <Swatch name="Paper 2" cls="bg-paper-2" fg="text-ink" />
          <Swatch name="Paper 3" cls="bg-paper-3" fg="text-ink" />
          <Swatch name="Ink" cls="bg-ink" fg="text-paper" />
          <Swatch name="Brass" cls="bg-brass" fg="text-paper" />
          <Swatch name="Brass soft" cls="bg-brass-soft" fg="text-ink" />
          <Swatch name="Green" cls="bg-green" fg="text-paper" />
          <Swatch name="Oxblood" cls="bg-oxblood" fg="text-paper" />
        </div>
      </Section>

      {/* Type */}
      <Section title="Type">
        <div className="space-y-3">
          <div className="font-display text-5xl leading-tight text-ink">Display, <em className="italic">serif italic</em>.</div>
          <div className="font-display text-3xl leading-tight text-ink">Section head.</div>
          <div className="font-body text-base text-ink">Body — the driver is the hire. Not the ride.</div>
          <div className="font-body text-sm text-ink-muted">Body muted — supplementary detail.</div>
          <div className="font-mono text-xs uppercase tracking-wider text-ink-muted">MONO LABEL · SECTION</div>
        </div>
      </Section>

      {/* Buttons */}
      <Section title="Buttons">
        <div className="flex flex-wrap gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button size="sm">Small</Button>
          <Button size="lg">Large</Button>
          <Button disabled>Disabled</Button>
        </div>
      </Section>

      {/* Form inputs */}
      <Section title="Form fields">
        <div className="grid gap-4 sm:grid-cols-2 max-w-2xl">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" placeholder="Ada Okonkwo" className="mt-2" />
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" placeholder="+234 801 234 5678" className="mt-2" />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" placeholder="Any special instructions…" className="mt-2" />
          </div>
        </div>
      </Section>

      {/* Portrait sizes + tier ring */}
      <Section title="Portrait">
        <div className="flex items-end gap-6">
          <Portrait initials="AO" size="xs" tier="t0" />
          <Portrait initials="AO" size="sm" tier="t1" />
          <Portrait initials="AO" size="md" tier="t2" />
          <Portrait initials="AO" size="lg" tier="t3" />
          <Portrait initials="AO" size="xl" tier="t4" />
        </div>
      </Section>

      {/* Tier badges */}
      <Section title="Tier badge">
        <div className="flex flex-wrap gap-2">
          <TierBadge tier="t0" label="long" />
          <TierBadge tier="t1" label="long" />
          <TierBadge tier="t2" label="long" />
          <TierBadge tier="t3" label="long" />
          <TierBadge tier="t4" label="long" />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <TierBadge tier="t2" size="sm" />
          <TierBadge tier="t3" />
          <TierBadge tier="t4" size="lg" />
        </div>
      </Section>

      {/* Stamp badges */}
      <Section title="Stamp badge">
        <div className="flex flex-wrap gap-2">
          <StampBadge label="Identity verified" />
          <StampBadge label="Background checked" Icon={ShieldCheck} />
          <StampBadge label="Defensive driving" Icon={Award} />
          <StampBadge label="Executive certified" Icon={FileCheck} variant="filled" />
        </div>
      </Section>

      {/* Step progress */}
      <Section title="Step progress">
        <StepProgressBar steps={ONBOARDING_STEPS} current={step} />
        <div className="mt-4 flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setStep(Math.max(0, step - 1))}>
            Back
          </Button>
          <Button
            size="sm"
            onClick={() => setStep(Math.min(ONBOARDING_STEPS.length - 1, step + 1))}
          >
            Next
          </Button>
        </div>
      </Section>

      {/* Card */}
      <Section title="Card">
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Ada Okonkwo</CardTitle>
              <CardDescription>Lagos · 6 years driving</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Portrait initials="AO" size="md" tier="t3" />
                <div className="flex-1">
                  <div className="font-body text-sm text-ink">Available today, 2 pm</div>
                  <div className="font-mono text-xs text-ink-muted">₦4,500/hour</div>
                </div>
                <TierBadge tier="t3" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Spec sheet</CardTitle>
              <CardDescription>Example use of SpecRow.</CardDescription>
            </CardHeader>
            <CardContent>
              <dl>
                <SpecRow label="Full name" value="Ada Okonkwo" />
                <SpecRow label="Phone" value="+234 801 234 5678" variant="mono" />
                <SpecRow label="Home base" value={<span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> Ikeja, Lagos</span>} />
                <SpecRow label="Hourly" value="₦4,500" variant="emphasis" />
              </dl>
            </CardContent>
          </Card>
        </div>
      </Section>

      {/* Dialog */}
      <Section title="Dialog">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="secondary">Open dialog</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm cancellation</DialogTitle>
              <DialogDescription>
                Cancelling within 2 hours of start incurs a 50% charge, per the terms you agreed to.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="secondary">Keep engagement</Button>
              </DialogClose>
              <Button variant="destructive">Cancel · charge applies</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Section>

      {/* Sheet */}
      <Section title="Sheet">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="secondary">Open bottom sheet</Button>
          </SheetTrigger>
          <SheetContent side="bottom">
            <SheetHeader>
              <SheetTitle>Book Ada Okonkwo</SheetTitle>
              <SheetDescription>Select the time and duration.</SheetDescription>
            </SheetHeader>
            <div className="mt-4">
              <SpecRow label="Rate" value="₦4,500/hour" variant="emphasis" />
              <SpecRow label="Minimum" value="2 hours" />
            </div>
          </SheetContent>
        </Sheet>
      </Section>

      {/* Toast */}
      <Section title="Toast">
        <div className="flex gap-3">
          <Button variant="secondary" size="sm" onClick={() => toast('Neutral message')}>
            Show toast
          </Button>
          <Button variant="secondary" size="sm" onClick={() => toast.success('Saved')}>
            Success
          </Button>
          <Button variant="secondary" size="sm" onClick={() => toast.error('Something went wrong')}>
            Error
          </Button>
        </div>
      </Section>

      {/* Empty + error state */}
      <Section title="Empty & error">
        <div className="grid gap-4 sm:grid-cols-2">
          <EmptyState
            Icon={Users}
            title="No engagements yet"
            description="When you book a driver, it'll show up here."
            action={<Button size="sm">Find a driver</Button>}
          />
          <ErrorState
            title="Couldn't load your engagements"
            description="Something on our end. Retry in a moment."
            onRetry={() => toast('Retrying…')}
          />
        </div>
      </Section>

      {/* Skeleton */}
      <Section title="Skeleton">
        <div className="border border-line bg-paper-2 p-5">
          <div className="flex items-center gap-3">
            <Skeleton className="h-14 w-14 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-14 border-t border-line pt-6">
      <SectionLabel>{title}</SectionLabel>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Swatch({ name, cls, fg }: { name: string; cls: string; fg: string }) {
  return (
    <div className={`flex h-24 items-end p-3 border border-line ${cls} ${fg}`}>
      <div className="font-mono text-[10px] uppercase tracking-wider">{name}</div>
    </div>
  );
}
