'use client';

import { useEffect, useState } from 'react';
import { Loader2, Bell, BellOff } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { getDeviceId, detectPlatform } from './install-tracker';

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function PushToggle() {
  const [supported, setSupported] = useState(true);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const ok = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setSupported(ok && !!VAPID);
    if (!ok) { setReady(true); return; }
    setPermission(Notification.permission);
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setSubscribed(!!sub))
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  async function enable() {
    if (!VAPID) return toast.error('Push is not configured yet.');
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') {
        toast.error(perm === 'denied' ? 'Notifications are blocked in your browser settings.' : 'Permission not granted.');
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID),
      });
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON(), deviceId: getDeviceId(), platform: detectPlatform() }),
      });
      if (!res.ok) throw new Error('save failed');
      setSubscribed(true);
      toast.success('Notifications enabled');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not enable notifications');
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setSubscribed(false);
      toast.success('Notifications turned off');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not turn off notifications');
    } finally {
      setBusy(false);
    }
  }

  if (!ready) return null;

  if (!supported) {
    return (
      <div className="rounded-2xl border border-admin-border bg-admin-card px-5 py-4 font-body text-sm text-admin-text-muted shadow-admin-sm">
        Push notifications aren&apos;t available on this device/browser. On iPhone, install Avanti to your home screen first (Share → Add to Home Screen), then enable them from the installed app.
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-admin-border bg-admin-card px-5 py-4 shadow-admin-sm">
      <div className="min-w-0">
        <div className="font-body text-sm font-medium text-admin-text">Push notifications</div>
        <div className="mt-0.5 font-body text-[12px] text-admin-text-muted">
          {subscribed ? 'On — you’ll get booking and account alerts on this device.' : 'Get booking and account alerts on this device.'}
        </div>
      </div>
      {subscribed ? (
        <button onClick={disable} disabled={busy} className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-admin-border px-4 py-2 font-body text-sm font-medium text-admin-text hover:bg-admin-bg disabled:opacity-50">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellOff className="h-4 w-4" strokeWidth={1.75} />} Turn off
        </button>
      ) : (
        <button onClick={enable} disabled={busy} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-admin-green px-4 py-2 font-body text-sm font-semibold text-white disabled:opacity-50">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" strokeWidth={2} />} Enable
        </button>
      )}
    </div>
  );
}
