import type { MetadataRoute } from 'next';

/**
 * Web app manifest — makes Avanti installable to the home screen (Android
 * shows an install prompt; iOS installs via Safari's Share → Add to Home
 * Screen). Next serves this at /manifest.webmanifest and links it automatically.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Avanti — Verified Drivers',
    short_name: 'Avanti',
    description:
      'Book verified professional drivers by the hour, day, or long-term. Nigeria’s curated driver marketplace.',
    id: '/',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0d1122',
    theme_color: '#0d1122',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
