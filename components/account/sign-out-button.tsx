'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    try {
      await fetch('/api/auth/signout', { method: 'POST' });
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push('/');
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={signOut}
      disabled={busy}
      className="inline-flex items-center gap-2 rounded-xl border border-admin-border bg-admin-card px-4 py-2 font-body text-sm font-medium text-admin-text shadow-admin-sm transition-colors hover:bg-admin-bg disabled:opacity-50"
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} /> : <LogOut className="h-4 w-4" strokeWidth={1.75} />}
      Sign out
    </button>
  );
}
