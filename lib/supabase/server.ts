import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import type { Database } from '@/types/database';

/**
 * Supabase clients — typed against the generated Database schema.
 *
 * Two flavours:
 *   - createClient()          — authenticated as the current user.
 *                                Enforces RLS. Use in server components
 *                                and API routes that should respect the
 *                                caller's permissions.
 *
 *   - createServiceRoleClient() — bypasses RLS. Use ONLY for privileged
 *                                writes (audit_logs, cross-user reads,
 *                                admin operations). Every call site
 *                                should be able to justify why it needs
 *                                to bypass RLS.
 *
 * Both are typed with <Database>, so .from('engagements').select('...')
 * type-checks column names at compile time. If you find yourself
 * reaching for `as any` — first check whether the column actually
 * exists in the DB. That's the bug this typing is designed to catch.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options as CookieOptions);
          });
        } catch {
          // Called from a Server Component. Safe to ignore if middleware
          // is refreshing sessions.
        }
      },
    },
  });
}

export function createServiceRoleClient() {
  return createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
