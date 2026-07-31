export const dynamic = 'force-dynamic';
import type { Metadata } from 'next';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';

export const metadata: Metadata = {
  title: 'Avanti',
  description:
    'The driver is the hire. Not the ride. Book verified professional drivers by the hour, day, or long-term.',
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
      </body>
    </html>
  );
}
