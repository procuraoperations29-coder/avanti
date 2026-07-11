import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { publicEnv, serverEnv, supabaseConfigured } from '@/config/env';
import type { Database } from '@/types/database';

/**
 * Supabase client for use in server components, route handlers, and
 * Server Actions. Reads cookies for session, uses the anon key + RLS.
 *
 * For operations that need to bypass RLS (money movement, verification
 * decisions, admin actions — see Phase 4 §16) use `createServiceRoleClient()`.
 */
export async function createClient() {
  if (!supabaseConfigured()) {
    throw new Error(
      '[avanti] Supabase not configured on server. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    );
  }

  const cookieStore = await cookies();

  return createServerClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL!,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Components can't set cookies; middleware handles refresh.
          }
        },
      },
    }
  );
}

/**
 * Service-role client — bypasses RLS entirely.
 *
 * See Phase 4 §16. Rules:
 *  - Only use in server code (this file is 'server-only').
 *  - Every write must re-verify identity + permissions itself (RLS is off).
 *  - Every write must produce an audit_logs row.
 *  - Use a transaction for multi-row writes.
 *
 * Callers should compose with the authorization guards in lib/auth.
 */
export function createServiceRoleClient() {
  const env = serverEnv();
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      '[avanti] SUPABASE_SERVICE_ROLE_KEY not set — cannot create service-role client.'
    );
  }
  if (!publicEnv.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error('[avanti] NEXT_PUBLIC_SUPABASE_URL not set.');
  }

  return createServerClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      cookies: {
        getAll: () => [],
        setAll: () => {},
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}
