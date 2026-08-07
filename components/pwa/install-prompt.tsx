'use client';

import { useEffect, useState } from 'react';
import { X, Download, Share } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'avanti-install-dismissed';

/**
 * Home-screen install nudge. Android/Chrome fires `beforeinstallprompt`, so we
 * show a real "Install" button. iOS Safari has no such event, so we show the
 * Share → Add to Home Screen instructions instead. Dismissal is remembered, and
 * nothing shows once the app is already installed (running standalone).
 */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(DISMISS_KEY) === '1') return;
    } catch { /* ignore */ }

    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (navigator as any).standalone === true;
    if (standalone) return;

    const ua = navigator.userAgent;
    const isIos = /iphone|ipad|ipod/i.test(ua);
    const isSafari = /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua);
    if (isIos && isSafari) {
      setIos(true);
      setShow(true);
      return;
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setShow(true);
    };
    const onInstalled = () => {
      setShow(false);
      try { localStorage.setItem(DISMISS_KEY, '1'); } catch { /* ignore */ }
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  function dismiss() {
    setShow(false);
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch { /* ignore */ }
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    dismiss();
  }

  if (!show) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-md rounded-2xl border border-white/10 bg-[#0d1122] p-4 text-white shadow-[0_16px_48px_-12px_rgba(0,0,0,0.6)]">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#16bd69] text-[13px] font-bold text-[#0d1122]">A</span>
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-semibold">Install Avanti</div>
          {ios ? (
            <p className="mt-0.5 flex items-center gap-1 text-[12.5px] leading-relaxed text-[#9aa8c6]">
              Tap <Share className="inline h-3.5 w-3.5" strokeWidth={2} /> Share, then <span className="font-medium text-white">Add to Home Screen</span>.
            </p>
          ) : (
            <p className="mt-0.5 text-[12.5px] leading-relaxed text-[#9aa8c6]">Add it to your home screen for one-tap access — no app store needed.</p>
          )}
          {!ios && (
            <button
              onClick={install}
              className="mt-2.5 inline-flex items-center gap-1.5 rounded-xl bg-[#16bd69] px-4 py-2 text-[13px] font-semibold text-[#04160c]"
            >
              <Download className="h-4 w-4" strokeWidth={2} /> Install app
            </button>
          )}
        </div>
        <button onClick={dismiss} aria-label="Dismiss" className="shrink-0 rounded-lg p-1 text-[#9aa8c6] hover:text-white">
          <X className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
