'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils/cn';

/**
 * Six-digit OTP input. Renders as one large input that auto-advances between
 * digits; on paste, distributes across all six.
 */

export interface OtpInputProps {
  onChange?: (code: string, complete: boolean) => void;
  onComplete?: (code: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}

export function OtpInput({ onChange, onComplete, disabled, autoFocus }: OtpInputProps) {
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);

  function handleDigit(idx: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1); // last digit typed
    const next = [...digits];
    next[idx] = digit;
    setDigits(next);

    const complete = next.every((d) => d.length === 1);
    const code = next.join('');
    onChange?.(code, complete);
    if (complete) onComplete?.(code);
    else if (digit && idx < 5) refs.current[idx + 1]?.focus();
  }

  function handleKeyDown(idx: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      refs.current[idx - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const next = pasted.padEnd(6, '').split('').slice(0, 6);
    setDigits(next);
    const code = next.join('');
    const complete = code.length === 6 && !code.includes('');
    onChange?.(code, complete);
    if (complete) onComplete?.(code);
    refs.current[Math.min(pasted.length, 5)]?.focus();
  }

  return (
    <div className="flex gap-2 justify-center" onPaste={handlePaste}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d}
          onChange={(e) => handleDigit(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          disabled={disabled}
          className={cn(
            'w-12 h-14 text-center font-display text-3xl border border-line-strong bg-paper-2 text-ink',
            'focus:border-ink focus:outline-none',
            disabled && 'opacity-60'
          )}
        />
      ))}
    </div>
  );
}
