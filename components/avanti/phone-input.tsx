'use client';

import { forwardRef, useState } from 'react';
import { cn } from '@/lib/utils/cn';

/**
 * Phone input for Avanti's African launch markets.
 *
 * Displays a country code prefix (default +234 Nigeria) and a national-
 * number field. Concatenates them into E.164 on submit.
 *
 * v1 keeps the country selector simple — NG default with a small set of
 * options. A proper country picker (with flags, search) lands in a
 * later slice when we add multi-country support.
 */

const COUNTRIES = [
  { code: 'NG', prefix: '+234', label: 'Nigeria' },
  { code: 'GH', prefix: '+233', label: 'Ghana' },
  { code: 'KE', prefix: '+254', label: 'Kenya' },
  { code: 'ZA', prefix: '+27', label: 'South Africa' },
] as const;

export interface PhoneInputProps {
  onChange?: (e164: string, valid: boolean) => void;
  disabled?: boolean;
  defaultCountry?: (typeof COUNTRIES)[number]['code'];
  autoFocus?: boolean;
}

export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(function PhoneInput(
  { onChange, disabled, defaultCountry = 'NG', autoFocus },
  ref
) {
  const [country, setCountry] = useState<(typeof COUNTRIES)[number]['code']>(defaultCountry);
  const [national, setNational] = useState('');

  const prefix = COUNTRIES.find((c) => c.code === country)?.prefix ?? '+234';

  function handleNational(value: string) {
    // Strip everything except digits, and drop a leading 0 (common NG habit)
    const digits = value.replace(/\D/g, '').replace(/^0+/, '');
    setNational(digits);
    const e164 = `${prefix}${digits}`;
    const valid = digits.length >= 7 && digits.length <= 14;
    onChange?.(e164, valid);
  }

  function handleCountry(nextCountry: (typeof COUNTRIES)[number]['code']) {
    setCountry(nextCountry);
    const nextPrefix = COUNTRIES.find((c) => c.code === nextCountry)?.prefix ?? '+234';
    const e164 = `${nextPrefix}${national}`;
    onChange?.(e164, national.length >= 7 && national.length <= 14);
  }

  return (
    <div
      className={cn(
        'flex items-center gap-2 border border-line-strong bg-paper-2 p-3 font-mono text-sm',
        disabled && 'opacity-60'
      )}
    >
      <select
        value={country}
        onChange={(e) => handleCountry(e.target.value as (typeof COUNTRIES)[number]['code'])}
        disabled={disabled}
        className="bg-transparent text-ink outline-none"
      >
        {COUNTRIES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.prefix} {c.label}
          </option>
        ))}
      </select>
      <input
        ref={ref}
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        placeholder="8012345678"
        value={national}
        onChange={(e) => handleNational(e.target.value)}
        disabled={disabled}
        autoFocus={autoFocus}
        className="flex-1 bg-transparent text-ink outline-none placeholder:text-ink-faint"
      />
    </div>
  );
});
