import { z } from 'zod';

/**
 * Env-var contract for Avanti.
 *
 * Validated at startup. If a required var is missing or malformed, the app
 * refuses to boot rather than failing mysteriously later. During early
 * development we mark most as .optional() so the app runs without every
 * service wired up — see docs/setup.md for the recommended order to fill
 * these in.
 *
 * NEVER put secrets in vars prefixed with NEXT_PUBLIC_. Those are shipped
 * to the client bundle.
 */

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url()
    .optional()
    .describe('Supabase project URL. Get from supabase.com dashboard → Project Settings → API.'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(20)
    .optional()
    .describe('Supabase anon key. Safe to expose; RLS protects data.'),
  NEXT_PUBLIC_APP_URL: z
    .string()
    .url()
    .default('http://localhost:3000')
    .describe('Base URL of the app. Used for redirects and email links.'),
  NEXT_PUBLIC_APP_ENV: z
    .enum(['development', 'preview', 'staging', 'production'])
    .default('development'),
});

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(20)
    .optional()
    .describe(
      'Supabase service_role key. BYPASSES RLS. Never exposed to client. See Phase 4 §16 for rules of use.'
    ),

  // Payments
  PAYSTACK_SECRET_KEY: z.string().min(10).optional(),
  PAYSTACK_WEBHOOK_SECRET: z.string().min(10).optional(),

  // Messaging (Twilio for SMS, Resend for email)
  TWILIO_ACCOUNT_SID: z.string().min(10).optional(),
  TWILIO_AUTH_TOKEN: z.string().min(10).optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),
  TWILIO_MESSAGING_SERVICE_SID: z.string().optional(),
  RESEND_API_KEY: z.string().min(10).optional(),
  RESEND_FROM_EMAIL: z
    .string()
    .email()
    .optional()
    .describe('e.g. no-reply@avanti.example — must be a verified sender in Resend.'),

  // Anti-abuse
  TURNSTILE_SECRET_KEY: z
    .string()
    .optional()
    .describe('Cloudflare Turnstile — CAPTCHA on signup, per Phase 4 §15.3'),
});

/**
 * Public env — safe to read on the client.
 */
export const publicEnv = publicSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
});

/**
 * Server env — parsed lazily so we can validate only when accessed from server code.
 * Client code that accidentally imports this will fail at build time, not runtime.
 */
let cachedServerEnv: z.infer<typeof serverSchema> | null = null;

export function serverEnv(): z.infer<typeof serverSchema> {
  if (typeof window !== 'undefined') {
    throw new Error(
      'serverEnv() called from client code — this leaks secrets to the browser bundle. Use publicEnv instead.'
    );
  }
  if (!cachedServerEnv) {
    cachedServerEnv = serverSchema.parse({
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
      PAYSTACK_SECRET_KEY: process.env.PAYSTACK_SECRET_KEY,
      PAYSTACK_WEBHOOK_SECRET: process.env.PAYSTACK_WEBHOOK_SECRET,
      TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
      TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
      TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER,
      TWILIO_MESSAGING_SERVICE_SID: process.env.TWILIO_MESSAGING_SERVICE_SID,
      RESEND_API_KEY: process.env.RESEND_API_KEY,
      RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
      TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY,
    });
  }
  return cachedServerEnv;
}

/**
 * Whether Supabase is configured. Used in early development to show
 * dev-mode banners and fall back to mock data.
 */
export function supabaseConfigured(): boolean {
  return Boolean(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL && publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
