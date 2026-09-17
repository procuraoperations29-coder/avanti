'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Pencil, X } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

type Initial = {
  full_name: string;
  email: string;
  phone: string;
  identity: { legal_name?: string; date_of_birth?: string; gender?: string; id_type?: string; id_number?: string };
  licence: { licence_number?: string; licence_class?: string; issue_date?: string; expiry_date?: string };
  address: { street_address?: string; city?: string; state?: string; landmark?: string };
  payout: { bank_name?: string; account_number?: string; account_holder_name?: string };
  experience: {
    years_experience?: number;
    service_radius_km?: number;
    can_drive_at_night?: boolean;
    has_smartphone?: boolean;
    vehicle_classes?: string[];
    transmission_experience?: string[];
    languages?: string[];
  };
};

const inputCls =
  'w-full rounded-xl border border-admin-border bg-admin-bg px-3 py-2 font-body text-sm text-admin-text outline-none focus:border-admin-green focus:ring-2 focus:ring-admin-green/20';
const labelCls = 'mb-1 block font-body text-[11px] uppercase tracking-wide text-admin-text-muted';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      {children}
    </label>
  );
}

export function DriverEditForm({ driverId, initial }: { driverId: string; initial: Initial }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const [fullName, setFullName] = useState(initial.full_name);
  const [email, setEmail] = useState(initial.email);
  const [phone, setPhone] = useState(initial.phone);

  const [identity, setIdentity] = useState(initial.identity);
  const [licence, setLicence] = useState(initial.licence);
  const [address, setAddress] = useState(initial.address);
  const [payout, setPayout] = useState(initial.payout);

  const [yearsExperience, setYearsExperience] = useState(initial.experience.years_experience?.toString() ?? '');
  const [serviceRadius, setServiceRadius] = useState(initial.experience.service_radius_km?.toString() ?? '');
  const [canDriveAtNight, setCanDriveAtNight] = useState(Boolean(initial.experience.can_drive_at_night));
  const [hasSmartphone, setHasSmartphone] = useState(Boolean(initial.experience.has_smartphone));
  const [vehicleClasses, setVehicleClasses] = useState((initial.experience.vehicle_classes ?? []).join(', '));
  const [transmissions, setTransmissions] = useState((initial.experience.transmission_experience ?? []).join(', '));
  const [languages, setLanguages] = useState((initial.experience.languages ?? []).join(', '));

  function toList(s: string): string[] {
    return s.split(',').map((v) => v.trim()).filter(Boolean);
  }

  async function save() {
    setBusy(true);
    try {
      const body: Record<string, unknown> = {
        action: 'update_details',
        full_name: fullName,
        email,
        phone,
        identity,
        licence,
        address,
        payout,
        experience: {
          years_experience: yearsExperience === '' ? undefined : Number(yearsExperience),
          service_radius_km: serviceRadius === '' ? undefined : Number(serviceRadius),
          can_drive_at_night: canDriveAtNight,
          has_smartphone: hasSmartphone,
          vehicle_classes: toList(vehicleClasses),
          transmission_experience: toList(transmissions),
          languages: toList(languages),
        },
      };
      const res = await fetch(`/api/admin/drivers/${driverId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const b = (await res.json()) as { ok?: boolean; error?: string; message?: string };
      if (!res.ok) return void toast.error(b.message ?? b.error ?? 'Update failed');
      toast.success('Driver details updated');
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-admin-border px-2.5 py-1.5 font-body text-[12px] font-medium text-admin-text hover:bg-admin-bg"
      >
        <Pencil className="h-3.5 w-3.5" strokeWidth={2} /> Edit details
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-admin-border bg-admin-card p-6 shadow-admin-sm">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold tracking-tight text-admin-text">Edit driver details</h2>
          <button onClick={() => setOpen(false)} className="rounded-full p-1 text-admin-text-muted hover:bg-admin-bg hover:text-admin-text" aria-label="Close">
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        <div className="space-y-6">
          <section>
            <h3 className="mb-2 font-body text-[13px] font-semibold text-admin-text">Contact</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Full name"><input className={inputCls} value={fullName} onChange={(e) => setFullName(e.target.value)} /></Field>
              <Field label="Email"><input className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
              <Field label="Phone"><input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
            </div>
          </section>

          <section>
            <h3 className="mb-2 font-body text-[13px] font-semibold text-admin-text">Identity</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Legal name"><input className={inputCls} value={identity.legal_name ?? ''} onChange={(e) => setIdentity({ ...identity, legal_name: e.target.value })} /></Field>
              <Field label="Date of birth"><input className={inputCls} placeholder="YYYY-MM-DD" value={identity.date_of_birth ?? ''} onChange={(e) => setIdentity({ ...identity, date_of_birth: e.target.value })} /></Field>
              <Field label="Gender"><input className={inputCls} value={identity.gender ?? ''} onChange={(e) => setIdentity({ ...identity, gender: e.target.value })} /></Field>
              <Field label="ID type"><input className={inputCls} value={identity.id_type ?? ''} onChange={(e) => setIdentity({ ...identity, id_type: e.target.value })} /></Field>
              <Field label="ID number"><input className={inputCls} value={identity.id_number ?? ''} onChange={(e) => setIdentity({ ...identity, id_number: e.target.value })} /></Field>
            </div>
          </section>

          <section>
            <h3 className="mb-2 font-body text-[13px] font-semibold text-admin-text">Licence</h3>
            <div className="grid gap-3 sm:grid-cols-4">
              <Field label="Number"><input className={inputCls} value={licence.licence_number ?? ''} onChange={(e) => setLicence({ ...licence, licence_number: e.target.value })} /></Field>
              <Field label="Class"><input className={inputCls} value={licence.licence_class ?? ''} onChange={(e) => setLicence({ ...licence, licence_class: e.target.value })} /></Field>
              <Field label="Issued"><input className={inputCls} placeholder="YYYY-MM-DD" value={licence.issue_date ?? ''} onChange={(e) => setLicence({ ...licence, issue_date: e.target.value })} /></Field>
              <Field label="Expires"><input className={inputCls} placeholder="YYYY-MM-DD" value={licence.expiry_date ?? ''} onChange={(e) => setLicence({ ...licence, expiry_date: e.target.value })} /></Field>
            </div>
          </section>

          <section>
            <h3 className="mb-2 font-body text-[13px] font-semibold text-admin-text">Address</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Street"><input className={inputCls} value={address.street_address ?? ''} onChange={(e) => setAddress({ ...address, street_address: e.target.value })} /></Field>
              <Field label="City"><input className={inputCls} value={address.city ?? ''} onChange={(e) => setAddress({ ...address, city: e.target.value })} /></Field>
              <Field label="State"><input className={inputCls} value={address.state ?? ''} onChange={(e) => setAddress({ ...address, state: e.target.value })} /></Field>
              <Field label="Landmark"><input className={inputCls} value={address.landmark ?? ''} onChange={(e) => setAddress({ ...address, landmark: e.target.value })} /></Field>
            </div>
          </section>

          <section>
            <h3 className="mb-2 font-body text-[13px] font-semibold text-admin-text">Payout</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Bank"><input className={inputCls} value={payout.bank_name ?? ''} onChange={(e) => setPayout({ ...payout, bank_name: e.target.value })} /></Field>
              <Field label="Account number"><input className={inputCls} value={payout.account_number ?? ''} onChange={(e) => setPayout({ ...payout, account_number: e.target.value })} /></Field>
              <Field label="Account holder"><input className={inputCls} value={payout.account_holder_name ?? ''} onChange={(e) => setPayout({ ...payout, account_holder_name: e.target.value })} /></Field>
            </div>
          </section>

          <section>
            <h3 className="mb-2 font-body text-[13px] font-semibold text-admin-text">Experience</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Years experience"><input type="number" min={0} className={inputCls} value={yearsExperience} onChange={(e) => setYearsExperience(e.target.value)} /></Field>
              <Field label="Service radius (km)"><input type="number" min={0} className={inputCls} value={serviceRadius} onChange={(e) => setServiceRadius(e.target.value)} /></Field>
              <Field label="Vehicle classes (comma-separated)"><input className={inputCls} value={vehicleClasses} onChange={(e) => setVehicleClasses(e.target.value)} /></Field>
              <Field label="Transmissions (comma-separated)"><input className={inputCls} value={transmissions} onChange={(e) => setTransmissions(e.target.value)} /></Field>
              <Field label="Languages (comma-separated)"><input className={inputCls} value={languages} onChange={(e) => setLanguages(e.target.value)} /></Field>
            </div>
            <div className="mt-3 flex gap-5">
              <label className="flex items-center gap-2 font-body text-sm text-admin-text">
                <input type="checkbox" checked={canDriveAtNight} onChange={(e) => setCanDriveAtNight(e.target.checked)} className="h-4 w-4 rounded border-admin-border" />
                Night driving
              </label>
              <label className="flex items-center gap-2 font-body text-sm text-admin-text">
                <input type="checkbox" checked={hasSmartphone} onChange={(e) => setHasSmartphone(e.target.checked)} className="h-4 w-4 rounded border-admin-border" />
                Has smartphone
              </label>
            </div>
          </section>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 border-t border-admin-border pt-4">
          <button onClick={() => setOpen(false)} disabled={busy} className="rounded-xl px-4 py-2 font-body text-sm font-medium text-admin-text-muted hover:bg-admin-bg disabled:opacity-50">
            Cancel
          </button>
          <button onClick={save} disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-admin-navy px-5 py-2 font-body text-sm font-medium text-white shadow-admin-sm hover:bg-admin-navy-2 disabled:opacity-50">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Save changes
          </button>
        </div>
      </div>
    </div>
  );
}
