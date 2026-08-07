export const dynamic = 'force-dynamic';
import type { Metadata, Viewport } from 'next';
import { Toaster } from '@/components/ui/sonner';
import { RegisterSW } from '@/components/pwa/register-sw';
import { InstallPrompt } from '@/components/pwa/install-prompt';
import { InstallTracker } from '@/components/pwa/install-tracker';
import './globals.css';

export const metadata: Metadata = {
  title: 'Avanti',
  description:
    'The driver is the hire. Not the ride. Book verified professional drivers by the hour, day, or long-term.',
  applicationName: 'Avanti',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Avanti' },
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
};

export const viewport: Viewport = {
  themeColor: '#0d1122',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/*
         * No-flash theme init. Runs before first paint: applies the `dark`
         * class from the saved preference (set by the admin theme toggle),
         * falling back to the OS setting. Only the admin console defines dark
         * tokens, so this never darkens the light-only marketing surfaces —
         * it just means a dark-console user never sees a light flash.
         */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('avanti-theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d);}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        {children}
        <Toaster />
        <RegisterSW />
        <InstallPrompt />
        <InstallTracker />
      </body>
    </html>
  );
}
