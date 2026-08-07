'use client';

import { useEffect } from 'react';

/** Stable per-device id (localStorage), shared with the install prompt. */
export function getDeviceId(): string {
  let id = '';
  try {
    id = localStorage.getItem('avanti-device-id') ?? '';
    if (!id) {
      id = (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem('avanti-device-id', id);
    }
  } catch { /* ignore */ }
  return id;
}

export function detectPlatform(): 'ios' | 'android' | 'desktop' | 'other' {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
  if (/android/i.test(ua)) return 'android';
  if (/windows|macintosh|linux/i.test(ua)) return 'desktop';
  return 'other';
}

/**
 * When the app is launched from the home screen (standalone display mode), tell
 * the server — once per session — so ops can see who's using the installed app.
 * Plain browser visits are not tracked.
 */
export function InstallTracker() {
  useEffect(() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
      if (!standalone) return;
      if (sessionStorage.getItem('avanti-install-tracked') === '1') return;
      fetch('/api/pwa/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: getDeviceId(), platform: detectPlatform(), source: 'standalone_launch', standalone: true }),
      })
        .then(() => sessionStorage.setItem('avanti-install-tracked', '1'))
        .catch(() => {});
    } catch { /* ignore */ }
  }, []);
  return null;
}
