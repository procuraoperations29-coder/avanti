'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

function getVisitorId(): string {
  try {
    let id = localStorage.getItem('avanti_vid');
    if (!id) {
      id = (crypto.randomUUID?.() ?? String(Date.now()) + Math.random().toString(36).slice(2));
      localStorage.setItem('avanti_vid', id);
    }
    return id;
  } catch {
    return '';
  }
}

/**
 * First-party page-view beacon. Fires once per path/query change; skips /admin.
 * Anonymous — sends only path, referrer, UTM tags and a random visitor id.
 */
export function PageViewTracker() {
  const pathname = usePathname();
  const search = useSearchParams();
  const last = useRef<string>('');

  useEffect(() => {
    if (!pathname || pathname.startsWith('/admin')) return;
    const key = `${pathname}?${search?.toString() ?? ''}`;
    if (last.current === key) return;
    last.current = key;

    const payload = {
      path: pathname,
      referrer: typeof document !== 'undefined' ? document.referrer || null : null,
      utmSource: search?.get('utm_source') ?? null,
      utmMedium: search?.get('utm_medium') ?? null,
      utmCampaign: search?.get('utm_campaign') ?? null,
      visitorId: getVisitorId(),
    };

    try {
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      if (navigator.sendBeacon && navigator.sendBeacon('/api/track/pageview', blob)) return;
    } catch { /* fall through to fetch */ }
    fetch('/api/track/pageview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  }, [pathname, search]);

  return null;
}
