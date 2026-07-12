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
  drivers_licence: "Driver's licence",
  proof_of_address: 'Proof of address',
  selfie: 'Selfie',
  vehicle_registration: 'Vehicle registration',
  insurance_certificate: 'Insurance',
  background_check_result: 'Background check result',
  medical_certificate: 'Medical',
  defensive_driving_cert: 'Defensive driving',
  executive_protection_cert: 'Executive protection',
  other: 'Other',
};

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
  const state = profile.onboarding_state ?? {};

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
            {profile.verification_status.replace(/_/g, ' ')}
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left: profile + spec */}
        <div className="md:col-span-1 space-y-6">
          <div className="border border-line bg-paper-2 p-5">
            <SectionLabel>Applicant details</SectionLabel>
            <dl className="mt-3">
              <SpecRow label="Full name" value={profile.users?.full_name ?? '—'} />
              <SpecRow label="Phone" value={profile.users?.phone ?? '—'} variant="mono" />
              <SpecRow label="Email" value={profile.users?.email || '—'} variant="mono" />
              <SpecRow label="Years experience" value={profile.years_experience ?? '—'} />
              <SpecRow
                label="Languages"
                value={(profile.languages ?? []).join(', ') || '—'}
              />
              <SpecRow
                label="Vehicle classes"
                value={(profile.vehicle_class_experience ?? []).join(', ') || '—'}
              />
              <SpecRow
                label="Transmissions"
                value={(profile.transmission_experience ?? []).join(', ') || '—'}
              />
              <SpecRow label="Service radius" value={profile.service_radius_km ? `${profile.service_radius_km} km` : '—'} />
              <SpecRow
                label="Submitted"
                value={
                  profile.onboarding_submitted_at
                    ? new Date(profile.onboarding_submitted_at).toLocaleString()
                    : '—'
                }
                variant="mono"
              />
            </dl>
          </div>

          {profile.bio && (
            <div className="border border-line bg-paper-2 p-5">
              <SectionLabel>Bio</SectionLabel>
              <p className="mt-3 font-body text-sm leading-relaxed text-ink">{profile.bio}</p>
            </div>
          )}

          {state.licence && (
            <div className="border border-line bg-paper-2 p-5">
              <SectionLabel>Licence details</SectionLabel>
              <dl className="mt-3">
                <SpecRow label="Number" value={state.licence.licenceNumber ?? '—'} variant="mono" />
                <SpecRow label="Expires" value={state.licence.licenceExpiryDate ?? '—'} variant="mono" />
              </dl>
            </div>
          )}
        </div>

        {/* Middle: documents */}
        <div className="md:col-span-2 space-y-6">
          <div className="border border-line bg-paper-2 p-5">
            <SectionLabel>Documents · {documents.length}</SectionLabel>
            {documents.length === 0 ? (
              <p className="mt-3 font-body text-sm text-ink-muted">
                No documents uploaded.
              </p>
            ) : (
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                {documents.map((d: {
                  id: string;
                  kind: string;
                  filename: string;
                  mime_type: string;
                  previewUrl: string | null;
                  uploaded_at: string;
                }) => (
                  <a
                    key={d.id}
                    href={d.previewUrl ?? '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group block border border-line-strong bg-paper transition-colors hover:bg-paper-3"
                  >
                    {d.previewUrl && d.mime_type.startsWith('image/') ? (
                      <img
                        src={d.previewUrl}
                        alt={DOC_LABEL[d.kind] ?? d.kind}
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
                        {DOC_LABEL[d.kind] ?? d.kind}
                      </div>
                      <div className="mt-0.5 truncate font-mono text-[10px] text-ink-muted">
                        {d.filename}
                      </div>
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
