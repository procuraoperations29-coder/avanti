'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

/**
 * Light / dark switch for the admin console.
 *
 * Writes the choice to localStorage('avanti-theme') and toggles the `dark`
 * class on <html> — the same class the no-flash boot script in the root
 * layout reads. State is derived from the DOM on mount (not from a default),
 * so the button always reflects whatever the boot script already applied and
 * there's no first-render mismatch. Rendered as a segmented control that sits
 * on the dark sidebar chrome.
 */
export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
    setMounted(true);
  }, []);

  function apply(dark: boolean) {
    setIsDark(dark);
    document.documentElement.classList.toggle('dark', dark);
    try {
      localStorage.setItem('avanti-theme', dark ? 'dark' : 'light');
    } catch {
      /* storage blocked — theme still applies for this session */
    }
  }

  return (
    <div
      className="flex items-center gap-1 rounded-xl bg-admin-navy-2/60 p-1"
      role="group"
      aria-label="Colour theme"
    >
      <button
        type="button"
        onClick={() => apply(false)}
        aria-pressed={mounted ? !isDark : undefined}
        className={
          'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 font-body text-[12px] font-medium transition-colors ' +
          (mounted && !isDark
            ? 'bg-white text-admin-navy shadow-sm'
            : 'text-admin-nav-text hover:text-white')
        }
      >
        <Sun className="h-3.5 w-3.5" strokeWidth={2} />
        Light
      </button>
      <button
        type="button"
        onClick={() => apply(true)}
        aria-pressed={mounted ? isDark : undefined}
        className={
          'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 font-body text-[12px] font-medium transition-colors ' +
          (mounted && isDark
            ? 'bg-admin-green text-admin-navy-2 shadow-sm'
            : 'text-admin-nav-text hover:text-white')
        }
      >
        <Moon className="h-3.5 w-3.5" strokeWidth={2} />
        Dark
      </button>
    </div>
  );
}
