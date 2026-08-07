'use client';

import { useEffect } from 'react';

/** Registers the service worker (needed for installability + offline fallback). */
export function RegisterSW() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        /* registration is best-effort; the app works without it */
      });
    }
  }, []);
  return null;
}
