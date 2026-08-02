import { z } from 'zod';

/**
 * Env-var contract for Avanti.
 *
 * Validated at startup. If a required var is missing or malformed, the app
 * refuses to boot rather than failing mysteriously later. During early
 * development we mark most as .optional() so the app runs without every
 * service wired up. Empty strings are treated as absent via .or(z.literal('')).
 */

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url()
    .optional()
    .or(z.literal(''))
    .describe('Supabase project URL.'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(20)
    .optional()
    .or(z.literal(''))
    .describe('Supabase anon key.'),
  NEXT_PUBLIC_APP_URL: z
    .string()
    .url()
    .default('http://localhost:3000'),
  NEXT_PUBLIC_APP_ENV: z
    .enum(['development', 'preview', 'staging', 'production'])
    .default('development'),
});

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(20)
    .optional()
    .or(z.literal(''))
    .describe('Supabase service_role key. Bypasses RLS. Never expose to client.'),

  PAYSTACK_SECRET_KEY: z.string().min(10).optional().or(z.literal('')),
  PAYSTACK_WEBHOOK_SECRET: z.string().min(10).optional().or(z.literal('')),

  TWILIO_ACCOUNT_SID: z.string().min(10).optional().or(z.literal('')),
  TWILIO_AUTH_TOKEN: z.string().min(10).optional().or(z.literal('')),
  TWILIO_PHONE_NUMBER: z.string().optional().or(z.literal('')),
  TWILIO_MESSAGING_SERVICE_SID: z.string().optional().or(z.literal('')),
  RESEND_API_KEY: z.string().min(10).optional().or(z.literal('')),
  RESEND_FROM_EMAIL: z.string().email().optional().or(z.literal('')),

  TURNSTILE_SECRET_KEY: z.string().optional().or(z.literal('')),

  // Shared secret Vercel Cron sends as `Authorization: Bearer <CRON_SECRET>`.
  CRON_SECRET: z.string().optional().or(z.literal('')),
});

export const publicEnv = publicSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
});

let cachedServerEnv: z.infer<typeof serverSchema> | null = null;

export function serverEnv(): z.infer<typeof serverSchema> {
  if (typeof window !== 'undefined') {
    throw new Error('serverEnv() called from client code');
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
      CRON_SECRET: process.env.CRON_SECRET,
    });
  }
  return cachedServerEnv;
}

export function supabaseConfigured(): boolean {
  return Boolean(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL &&
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    publicEnv.NEXT_PUBLIC_SUPABASE_URL.length > 0 &&
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY.length > 0
  );
}