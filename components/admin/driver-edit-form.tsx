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

      // Only include fields that are non-empty
      if (fullName?.trim()) body.full_name = fullName.trim();
      if (email?.trim()) body.email = email.trim();
      if (phone?.trim()) body.phone = phone.trim();

      // Build identity object with only non-empty fields
      const identityData: Record<string, string> = {};
      if (identity.legal_name?.trim()) identityData.legal_name = identity.legal_name.trim();
      if (identity.date_of_birth?.trim()) identityData.date_of_birth = identity.date_of_birth.trim();
      if (identity.gender?.trim()) identityData.gender = identity.gender.trim();
      if (identity.id_type?.trim()) identityData.id_type = identity.id_type.trim();
      if (identity.id_number?.trim()) identityData.id_number = identity.id_number.trim();
      if (Object.keys(identityData).length > 0) body.identity = identityData;

      // Build licence object
      const licenceData: Record<string, string> = {};
      if (licence.licence_number?.trim()) licenceData.licence_number = licence.licence_number.trim();
      if (licence.licence_class?.trim()) licenceData.licence_class = licence.licence_class.trim();
      if (licence.issue_date?.trim()) licenceData.issue_date = licence.issue_date.trim();
      if (licence.expiry_date?.trim()) licenceData.expiry_date = licence.expiry_date.trim();
      if (Object.keys(licenceData).length > 0) body.licence = licenceData;

      // Build address object
      const addressData: Record<string, string> = {};
      if (address.street_address?.trim()) addressData.street_address = address.street_address.trim();
      if (address.city?.trim()) addressData.city = address.city.trim();
      if (address.state?.trim()) addressData.state = address.state.trim();
      if (address.landmark?.trim()) addressData.landmark = address.landmark.trim();
      if (Object.keys(addressData).length > 0) body.address = addressData;

      // Build payout object
      const payoutData: Record<string, string> = {};
      if (payout.bank_name?.trim()) payoutData.bank_name = payout.bank_name.trim();
      if (payout.account_number?.trim()) payoutData.account_number = payout.account_number.trim();
      if (payout.account_holder_name?.trim()) payoutData.account_holder_name = payout.account_holder_name.trim();
      if (Object.keys(payoutData).length > 0) body.payout = payoutData;

      // Build experience object
      const experienceObj: Record<string, unknown> = {};
      if (yearsExperience?.trim()) experienceObj.years_experience = Number(yearsExperience);
      if (serviceRadius?.trim()) experienceObj.service_radius_km = Number(serviceRadius);
      if (canDriveAtNight !== undefined) experienceObj.can_drive_at_night = canDriveAtNight;
      if (hasSmartphone !== undefined) experienceObj.has_smartphone = hasSmartphone;
      const vc = toList(vehicleClasses);
      if (vc.length > 0) experienceObj.vehicle_classes = vc;
      const te = toList(transmissions);
      if (te.length > 0) experienceObj.transmission_experience = te;
      const langs = toList(languages);
      if (langs.length > 0) experienceObj.languages = langs;
      if (Object.keys(experienceObj).length > 0) body.experience = experienceObj;

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
