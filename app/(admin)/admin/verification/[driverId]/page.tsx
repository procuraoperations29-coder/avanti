import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getAuthUser, hasPermission } from '@/lib/auth';
import { fetchDriverForReview } from '@/app/api/admin/verification/queue/route';
import { SectionLabel } from '@/components/avanti/section-label';
import { SpecRow } from '@/components/avanti/spec-row';
import { TierBadge } from '@/components/avanti/tier-badge';
import { DecisionPanel } from '@/components/admin/decision-panel';

const DOC_LABEL: Record<string, string> = {
  national_id: 'National ID',
  passport: 'Passport',
  voter_card: "Voter's card",
  driver_licence_front: "Driver's licence (front)",
  driver_licence_back: "Driver's licence (back)",
  utility_bill: 'Proof of address',
  bank_statement: 'Bank statement',
  selfie: 'Selfie',
  vehicle_insurance: 'Vehicle insurance',
  medical_note: 'Medical',
  reference_letter: 'Reference letter',
  background_check_result: 'Background check',
  other: 'Other',
};

function humanise(str: string | null | undefined): string {
  if (!str) return '—';
  return String(str).replace(/_/g, ' ');
}

export default async function DriverVerificationReviewPage({
  params,
}: {
  params: Promise<{ driverId: string }>;
}) {
  const { driverId } = await params;

  const user = await getAuthUser();
  if (!user) redirect('/sign-in');
  if (!hasPermission(user.roles, 'verification.decide')) {
    redirect('/admin');
  }

  const review = await fetchDriverForReview(driverId);
  if (!review) notFound();

  const { profile, documents, events } = review;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const state = (profile.onboarding_state ?? {}) as Record<string, any>;
  const identity = state.identity ?? {};
  const licence = state.licence ?? {};
  const address = state.address ?? {};
  const background = state.background ?? {};
  const experience = state.experience ?? {};
  const payout = state.payout ?? {};

  const onDemand = Boolean(profile.available_on_demand);
  const permanent = Boolean(profile.available_permanent);
  const availabilitySummary =
    onDemand && permanent
      ? 'Both — on-demand and permanent'
      : onDemand
        ? 'On-demand only'
        : permanent
          ? 'Permanent only'
          : '—';

  const languages = Array.isArray(experience.languages) ? experience.languages.join(', ') : '—';
  const vehicleClasses = Array.isArray(experience.vehicle_classes)
    ? experience.vehicle_classes.join(', ')
    : '—';
  const transmissions = Array.isArray(experience.transmission_experience)
    ? experience.transmission_experience.join(', ')
    : '—';

  const references = Array.isArray(background.references) ? background.references : [];

  return (
    <div className="mx-auto max-w-5xl px-4 pt-8 sm:px-6 pb-24">
      <Link
        href="/admin/verification"
        className="mb-6 inline-block font-mono text-xs uppercase tracking-wider text-ink-muted hover:text-ink"
      >
        ← Queue
      </Link>

      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <SectionLabel>Under review</SectionLabel>
          <h1 className="mt-2 font-display text-4xl leading-tight text-ink">
            {profile.users?.full_name ?? 'Driver'}
          </h1>
          <div className="mt-2 font-mono text-sm text-ink-muted">
            {profile.users?.phone ?? '—'} · {profile.users?.country_code ?? '—'}
          </div>
        </div>
        <div className="text-right">
          <TierBadge tier={(profile.verification_tier as 't0' | 't1' | 't2' | 't3' | 't4') ?? 't0'} label="long" />
          <div className="mt-2 font-mono text-[10px] uppercase tracking-wider text-ink-muted">
            {humanise(profile.verification_status)}
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left column: applicant details */}
        <div className="md:col-span-1 space-y-6">
          <div className="border border-line bg-paper-2 p-5">
            <SectionLabel>Applicant details</SectionLabel>
            <dl className="mt-3">
              <SpecRow label="Full name" value={profile.users?.full_name ?? '—'} />
              <SpecRow label="Phone" value={profile.users?.phone ?? '—'} variant="mono" />
              <SpecRow label="Email" value={profile.users?.email || '—'} variant="mono" />
              <SpecRow
                label="Submitted"
                value={
                  profile.onboarding_submitted_at
                    ? new Date(profile.onboarding_submitted_at).toLocaleString()
                    : '—'
                }
                variant="mono"
              />
              <SpecRow label="Availability" value={availabilitySummary} />
            </dl>
          </div>

          <div className="border border-line bg-paper-2 p-5">
            <SectionLabel>Identity</SectionLabel>
            <dl className="mt-3">
              <SpecRow label="Legal name" value={identity.legal_name ?? '—'} />
              <SpecRow label="Date of birth" value={identity.date_of_birth ?? '—'} variant="mono" />
              <SpecRow label="Gender" value={humanise(identity.gender)} />
              <SpecRow label="ID type" value={humanise(identity.id_type)} />
              <SpecRow label="ID number" value={identity.id_number ?? '—'} variant="mono" />
            </dl>
          </div>

          <div className="border border-line bg-paper-2 p-5">
            <SectionLabel>Licence</SectionLabel>
            <dl className="mt-3">
              <SpecRow label="Number" value={licence.licence_number ?? '—'} variant="mono" />
              <SpecRow label="Class" value={licence.licence_class ?? '—'} />
              <SpecRow label="Issued" value={licence.issue_date ?? '—'} variant="mono" />
              <SpecRow label="Expires" value={licence.expiry_date ?? '—'} variant="mono" />
            </dl>
          </div>

          <div className="border border-line bg-paper-2 p-5">
            <SectionLabel>Address</SectionLabel>
            <dl className="mt-3">
              <SpecRow label="Street" value={address.street_address ?? '—'} />
              <SpecRow label="City" value={address.city ?? '—'} />
              <SpecRow label="State" value={address.state ?? '—'} />
              <SpecRow label="Landmark" value={address.landmark ?? '—'} />
            </dl>
          </div>

          <div className="border border-line bg-paper-2 p-5">
            <SectionLabel>Experience</SectionLabel>
            <dl className="mt-3">
              <SpecRow label="Years" value={experience.years_experience?.toString() ?? '—'} />
              <SpecRow label="Vehicle classes" value={vehicleClasses} />
              <SpecRow label="Transmissions" value={transmissions} />
              <SpecRow label="Languages" value={languages} />
              <SpecRow
                label="Night driving"
                value={experience.can_drive_at_night === undefined ? '—' : experience.can_drive_at_night ? 'Yes' : 'No'}
              />
              <SpecRow
                label="Smartphone"
                value={experience.has_smartphone === undefined ? '—' : experience.has_smartphone ? 'Yes' : 'No'}
              />
              <SpecRow
                label="Service radius"
                value={experience.service_radius_km ? `${experience.service_radius_km} km` : '—'}
              />
            </dl>
          </div>

          <div className="border border-line bg-paper-2 p-5">
            <SectionLabel>Background</SectionLabel>
            <dl className="mt-3">
              <SpecRow
                label="Criminal disclosure"
                value={
                  background.criminal_record_disclosure === undefined
                    ? '—'
                    : background.criminal_record_disclosure
                      ? 'Yes'
                      : 'No'
                }
              />
            </dl>
            {references.length > 0 && (
              <div className="mt-4 space-y-3 border-t border-line pt-4">
                {references.map((ref: { name?: string; phone?: string; relationship?: string; years_known?: number }, i: number) => (
                  <div key={i}>
                    <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                      Reference {i + 1}
                    </div>
                    <div className="mt-1 font-body text-sm text-ink">{ref.name ?? '—'}</div>
                    <div className="font-mono text-xs text-ink-muted">{ref.phone ?? '—'}</div>
                    <div className="font-body text-xs text-ink-muted">
                      {ref.relationship ?? '—'}
                      {ref.years_known ? ` · ${ref.years_known} years known` : ''}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {background.criminal_record_details && (
              <div className="mt-4 border-t border-line pt-4">
                <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                  Disclosure details
                </div>
                <p className="font-body text-sm leading-relaxed text-ink">
                  {background.criminal_record_details}
                </p>
              </div>
            )}
          </div>

          <div className="border border-line bg-paper-2 p-5">
            <SectionLabel>Payout</SectionLabel>
            <dl className="mt-3">
              <SpecRow label="Bank" value={payout.bank_name ?? '—'} />
              <SpecRow label="Account no." value={payout.account_number ?? '—'} variant="mono" />
              <SpecRow label="Account holder" value={payout.account_holder_name ?? '—'} />
            </dl>
          </div>
        </div>

        {/* Right column: documents + history */}
        <div className="md:col-span-2 space-y-6">
          <div className="border border-line bg-paper-2 p-5">
            <SectionLabel>Documents · {documents.length}</SectionLabel>
            {documents.length === 0 ? (
              <p className="mt-3 font-body text-sm text-ink-muted">
                No documents uploaded.
              </p>
            ) : (
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                {documents.map((d) => (
                  <a
                    key={d.id}
                    href={d.previewUrl ?? '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group block border border-line-strong bg-paper transition-colors hover:bg-paper-3"
                  >
                    {d.previewUrl && d.mime_type.startsWith('image/') ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={d.previewUrl}
                        alt={DOC_LABEL[d.document_type] ?? d.document_type}
                        className="h-48 w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-48 items-center justify-center bg-paper-3">
                        <div className="font-mono text-xs uppercase tracking-wider text-ink-muted">
                          {d.mime_type}
                        </div>
                      </div>
                    )}
                    <div className="border-t border-line-strong p-3">
                      <div className="font-mono text-xs uppercase tracking-wider text-ink">
                        {DOC_LABEL[d.document_type] ?? d.document_type}
                      </div>
                      <div className="mt-0.5 truncate font-mono text-[10px] text-ink-muted">
                        {d.filename}
                      </div>
                      {d.reference_number && (
                        <div className="mt-1 font-mono text-[10px] text-ink-muted">
                          Ref: {d.reference_number}
                        </div>
                      )}
                      {d.expiry_date && (
                        <div className="mt-1 font-mono text-[10px] text-ink-muted">
                          Expires: {d.expiry_date}
                        </div>
                      )}
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>

          {events.length > 0 && (
            <div className="border border-line bg-paper-2 p-5">
              <SectionLabel>History</SectionLabel>
              <ul className="mt-3 space-y-3">
                {events.map((e: {
                  id: string;
                  event_type: string;
                  from_tier: string | null;
                  to_tier: string | null;
                  rationale: string | null;
                  created_at: string;
                }) => (
                  <li key={e.id} className="border-l-2 border-line-strong pl-3">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-mono text-xs uppercase tracking-wider text-ink">
                        {e.event_type.replace(/_/g, ' ')}
                        {e.to_tier && ` → ${e.to_tier.toUpperCase()}`}
                      </span>
                      <span className="font-mono text-[10px] text-ink-muted">
                        {new Date(e.created_at).toLocaleString()}
                      </span>
                    </div>
                    {e.rationale && (
                      <p className="mt-1 font-body text-sm text-ink">{e.rationale}</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8">
        <DecisionPanel driverId={driverId} />
      </div>
    </div>
  );
}
