'use client';

import { createBrowserClient } from '@supabase/ssr';
import { publicEnv, supabaseConfigured } from '@/config/env';
import type { Database } from '@/types/database';

/**
 * Supabase client for use in client components ('use client').
 *
 * Uses the anon key. All access is filtered by RLS (Phase 3 §22) and
 * additionally scoped by projection views (Phase 3 §23).
 *
 * Returns a real client if configured, or a typed stub that logs and
 * throws on operations — so unconfigured local dev doesn't crash the
 * whole page but does make it obvious in the console what's missing.
 */
export function createClient() {
  if (!supabaseConfigured()) {
    // Development stub — returns a Proxy that throws on use with a
    // helpful message. In production the env-var validation prevents
    // this branch from ever being reached.
    if (typeof console !== 'undefined') {
      console.warn(
        '[avanti] Supabase not configured. See .env.example and docs/setup.md.'
      );
    }
    return createStubClient();
  }

  return createBrowserClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL!,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

function createStubClient(): ReturnType<typeof createBrowserClient<Database>> {
  const notConfigured = (op: string) => () => {
    throw new Error(
      `[avanti] Supabase not configured — cannot ${op}. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.`
    );
  };
  return new Proxy({} as ReturnType<typeof createBrowserClient<Database>>, {
    get(_target, prop) {
      return notConfigured(String(prop));
    },
  });
}
