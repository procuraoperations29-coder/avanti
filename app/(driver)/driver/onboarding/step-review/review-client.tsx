'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Loader2, Pencil, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';
import type {
  IdentityData,
  LicenceData,
  AddressData,
  BackgroundData,
  ExperienceData,
  PayoutData,
} from '@/lib/onboarding/state';

interface ReviewProps {
  identity: IdentityData;
  licence: LicenceData;
  address: AddressData;
  background: BackgroundData;
  experience: ExperienceData;
  availability: string | null;
  payout: PayoutData;
}

export function ReviewClient(props: ReviewProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const {
    identity,
    licence,
    address,
    background,
    experience,
    availability,
    payout,
  } = props;

  // Quick sanity check: every step has at least SOMETHING
  const missingSteps: string[] = [];
  if (!identity.legal_name || !identity.id_number) missingSteps.push('Identity');
  if (!licence.licence_number || !licence.expiry_date) missingSteps.push('Licence');
  if (!address.street_address || !address.city) missingSteps.push('Address');
  if (!background.references || background.references.length < 2) missingSteps.push('Background');
  if (!experience.vehicle_classes || experience.vehicle_classes.length === 0) missingSteps.push('Experience');
  if (!availability) missingSteps.push('Availability');
  if (!payout.account_number || !payout.bank_code) missingSteps.push('Payout');

  const submit = async () => {
    if (missingSteps.length > 0) {
      toast.error(`Please complete: ${missingSteps.join(', ')}`);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/driver/onboarding/submit', {
        method: 'POST',
      });
      const body = (await res.json()) as { submitted?: boolean; error?: string; message?: string };
      if (!res.ok) {
        toast.error(body.message ?? body.error ?? 'Submit failed');
        return;
      }
      toast.success('Submitted. Verification pending.');
      // Full page reload so middleware picks up updated verification_status
      window.location.href = '/driver/onboarding/step-pending';
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Submit failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      {missingSteps.length > 0 && (
        <div className="mb-10 border border-oxblood bg-oxblood-soft px-6 py-5">
          <div className="mb-2 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-oxblood" strokeWidth={1.5} />
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-oxblood">
              Not complete
            </div>
          </div>
          <p className="font-body text-sm leading-relaxed text-ink">
            Please finish these before submitting: {missingSteps.join(', ')}
          </p>
        </div>
      )}

      {/* Identity */}
      <ReviewSection
        title="Identity"
        editHref="/driver/onboarding/step-identity"
        rows={[
          ['Legal name', identity.legal_name],
          ['Date of birth', identity.date_of_birth],
          ['Gender', identity.gender && humaniseGender(identity.gender)],
          ['ID type', identity.id_type && humaniseIdType(identity.id_type)],
          ['ID number', identity.id_number],
        ]}
      />

      {/* Licence */}
      <ReviewSection
        title="Licence"
        editHref="/driver/onboarding/step-licence"
        rows={[
          ['Licence number', licence.licence_number],
          ['Class', licence.licence_class],
          ['Issue date', licence.issue_date],
          ['Expiry date', licence.expiry_date],
        ]}
      />

      {/* Address */}
      <ReviewSection
        title="Address"
        editHref="/driver/onboarding/step-address"
        rows={[
          ['Street', address.street_address],
          ['City', address.city],
          ['State', address.state],
          ['Landmark', address.landmark],
        ]}
      />

      {/* Background */}
      <ReviewSection
        title="Background"
        editHref="/driver/onboarding/step-background"
        rows={[
          ['Reference 1', background.references?.[0]?.name],
          ['Reference 1 phone', background.references?.[0]?.phone],
          ['Reference 2', background.references?.[1]?.name],
          ['Reference 2 phone', background.references?.[1]?.phone],
          ['Criminal disclosure', background.criminal_record_disclosure ? 'Yes (see notes)' : 'No'],
        ]}
      />

      {/* Experience */}
      <ReviewSection
        title="Experience"
        editHref="/driver/onboarding/step-experience"
        rows={[
          ['Years', experience.years_experience?.toString()],
          ['Vehicle classes', experience.vehicle_classes?.join(', ')],
          ['Transmissions', experience.transmission_experience?.join(', ')],
          ['Languages', experience.languages?.join(', ')],
          ['Night driving', experience.can_drive_at_night ? 'Yes' : 'No'],
          ['Smartphone', experience.has_smartphone ? 'Yes' : 'No'],
          ['Service radius', experience.service_radius_km ? `${experience.service_radius_km} km` : undefined],
        ]}
      />

      {/* Availability */}
      <ReviewSection
        title="Availability"
        editHref="/driver/onboarding/step-availability"
        rows={[
          ['Preference', availability && humaniseAvailability(availability)],
        ]}
      />

      {/* Payout */}
      <ReviewSection
        title="Payout"
        editHref="/driver/onboarding/step-payout"
        rows={[
          ['Bank', payout.bank_name],
          ['Account number', payout.account_number],
          ['Account holder', payout.account_holder_name],
        ]}
      />

      <div className="mt-12 border-l-2 border-brass bg-brass-soft px-6 py-5">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-brass">
          By submitting
        </div>
        <p className="mt-2 max-w-2xl font-body text-sm leading-relaxed text-ink">
          You confirm the information above is accurate and honest. You authorise
          Avanti to verify your ID, licence, and address with the relevant issuing
          authorities. Providing false information is grounds for immediate
          rejection and permanent bar from the platform.
        </p>
      </div>

      <div className="mt-10 flex items-center justify-between border-t border-line pt-8">
        <div className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
          Step 07 of 07
        </div>
        <Button
          onClick={submit}
          disabled={busy || missingSteps.length > 0}
          size="lg"
          className="min-w-[220px]"
        >
          {busy ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" strokeWidth={1.5} />
              Submitting…
            </>
          ) : (
            <>
              Submit for review
              <ArrowRight className="ml-2 h-4 w-4" strokeWidth={1.5} />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function ReviewSection({
  title,
  editHref,
  rows,
}: {
  title: string;
  editHref: string;
  rows: Array<[string, string | undefined | null]>;
}) {
  return (
    <div className="mb-6 border border-line bg-paper-2 p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
          {title}
        </div>
        <Link
          href={editHref}
          className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-ink hover:text-brass"
        >
          <Pencil className="h-3 w-3" strokeWidth={1.5} />
          Edit
        </Link>
      </div>
      <dl className="space-y-2">
        {rows
          .filter(([, v]) => v !== null && v !== undefined && v !== '')
          .map(([label, value]) => (
            <div key={label} className="grid grid-cols-3 gap-4">
              <dt className="col-span-1 font-mono text-xs text-ink-muted">{label}</dt>
              <dd className="col-span-2 font-body text-sm text-ink">{value}</dd>
            </div>
          ))}
        {rows.every(([, v]) => v === null || v === undefined || v === '') && (
          <p className="font-mono text-xs italic text-ink-faint">Nothing entered yet</p>
        )}
      </dl>
    </div>
  );
}

function humaniseGender(g: string): string {
  const map: Record<string, string> = {
    male: 'Male',
    female: 'Female',
    prefer_not_to_say: 'Prefer not to say',
  };
  return map[g] ?? g;
}

function humaniseIdType(t: string): string {
  const map: Record<string, string> = {
    nin: 'National ID (NIN)',
    passport: 'International passport',
    drivers_licence: "Driver's licence",
    voters_card: "Voter's card",
  };
  return map[t] ?? t;
}

function humaniseAvailability(a: string): string {
  const map: Record<string, string> = {
    on_demand: 'On-demand (hourly / daily bookings)',
    permanent: 'Permanent placement (monthly salary)',
    both: 'Both — open to on-demand and permanent',
  };
  return map[a] ?? a;
}
