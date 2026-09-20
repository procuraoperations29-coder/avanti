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
  const
