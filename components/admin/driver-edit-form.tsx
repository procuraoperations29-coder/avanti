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
      };

      // Only include user fields if they've been set
      if (fullName) body.full_name = fullName;
      if (email) body.email = email;
      if (phone) body.phone = phone;

      // Only include onboarding sections if they have actual data
      const identityData: Record<string, unknown> = {};
      if (identity.legal_name) identityData.legal_name = identity.legal_name;
      if (identity.date_of_birth) identityData.date_of_birth = identity.date_of_birth;
      if (identity.gender) identityData.gender = identity.gender;
      if (identity.id_type) identityData.id_type = identity.id_type;
      if (identity.id_number) identityData.id_number = identity.id_number;
      if (Object.keys(identityData).length > 0) body.identity = identityData;

      const licenceData: Record<string, unknown> = {};
      if (licence.licence_number) licenceData.licence_number = licence.licence_number;
      if (licence.licence_class) licenceData.licence_class = licence.licence_class;
      if (licence.issue_date) licenceData.issue_date = licence.issue_date;
      if (licence.expiry_date) licenceData.expiry_date = licence.expiry_date;
      if (Object.keys(licenceData).length > 0) body.licence = licenceData;

      const addressData: Record<string, unknown> = {};
      if (address.street_address) addressData.street_address = address.street_address;
      if (address.city) addressData.city = address.city;
      if (address.state) addressData.state = address.state;
      if (address.landmark) addressData.landmark = address.landmark;
      if (Object.keys(addressData).length > 0) body.address = addressData;

      const payoutData: Record<string, unknown> = {};
      if (payout.bank_name) payoutData.bank_name = payout.bank_name;
      if (payout.account_number) payoutData.account_number = payout.account_number;
      if (payout.account_holder_name) payoutData.account_holder_name = payout.account_holder_name;
      if (Object.keys(payoutData).length > 0) body.payout = payoutData;

      const experienceObj: Record<string, unknown> = {};
      if (yearsExperience) experienceObj.years_experience = Number(yearsExperience);
      if (serviceRadius) experienceObj.service_radius_km = Number(serviceRadius);
      experienceObj.can_drive_at_night = canDriveAtNight;
      experienceObj.has_smartphone = hasSmartphone;
      const vc = toList(vehicleClasses);
      if (vc.length > 0) experienceObj.vehicle_classes = vc;
      const te = toList(transmissions);
      if (te.length > 0) experienceObj.transmission_experience = te;
      const langs = toList(languages);
      if (langs.length > 0) experienceObj.languages = langs;
      if (Object.keys(experienceObj).length > 2) body.experience = experienceObj;

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
