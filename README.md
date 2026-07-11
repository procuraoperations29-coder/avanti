# Avanti

Professional driver hiring platform. Merchant-of-record marketplace: customers hire verified drivers to operate their own vehicles.

## Run

```bash
corepack enable && corepack prepare pnpm@9.12.1 --activate
pnpm install
cp .env.example .env.local
pnpm dev
```

Open http://localhost:3000. Landing page renders without any services configured; features light up as env vars are filled in.

## Layout

```
app/(public|auth|customer|driver|corporate|admin|api)/
components/ui/          shadcn-style primitives
components/avanti/      Avanti composites
lib/supabase/           browser + server + service-role clients
lib/pricing/            rate-card engine
lib/auth/               withAuth, requirePermissions middleware
config/env.ts           Zod-validated env vars
supabase/migrations/    numbered DDL (Phase 3)
types/database.ts       generated from Supabase schema
```

## Commands

```
pnpm dev · build · typecheck · lint · format
pnpm db:push · db:diff · db:reset
```

## Invariants (enforced in PR review)

1. Every server-side permission has a paired RLS policy.
2. Service-role writes assert identity, assert permissions, and write an `audit_logs` row.
3. Customer views never expose `driver_payout`; driver views never expose `customer_price`.
