# Onboarding Wizard — Chunk 1 of 4 (Foundations)

9 files. The scaffolding for driver onboarding: storage bucket, save-step
and upload endpoints, wizard layout, start + pending pages, and a fixed
driver signup redirect. Middle steps (identity → licence → address →
background → experience → payout → review) come in chunks 2-4.

## Apply

```bash
cd ~/Downloads
unzip -o onboard-chunk-1.zip -d /tmp/onboard1-extract
cp -r /tmp/onboard1-extract/onboard1/* ~/Desktop/Avanti/
rm -rf /tmp/onboard1-extract ~/Desktop/Avanti/.next

cd ~/Desktop/Avanti
supabase db push
supabase gen types typescript --linked > types/database.ts

git add -A && git commit -m "onboarding chunk 1: storage, layout, start, pending, save-step, upload" && git push
```

## Test after Vercel finishes

1. Fresh driver signup at `www.avanti.com.ng/sign-up/driver` (use a new email)
2. Enter code → land on `/driver/onboarding` root
3. Root redirects to `/driver/onboarding/step-start` (no prior progress)
4. See the "Welcome to Avanti" page with the checklist
5. Click Begin → routes to `/driver/onboarding/step-identity`
6. **Which will 404** — that's built in Chunk 2. Expected.

To progress your test driver past step-start manually before Chunk 2 lands,
you can insert dummy state in SQL:

```sql
UPDATE driver_profiles
SET onboarding_state = jsonb_set(onboarding_state, '{last_step_completed}', '"start"'::jsonb)
WHERE user_id = 'YOUR_DRIVER_USER_ID';
```

## What ships in Chunk 1

**Migration**
- `20260818000000_onboarding_storage.sql` — Creates `onboarding-documents`
  bucket with RLS (drivers can only touch their own folder, admins read all).
  Adds `onboarding_state` jsonb + `onboarding_submitted_at` columns to
  driver_profiles if they don't exist yet.

**Library**
- `lib/onboarding/state.ts` — Step definitions, TypeScript types for each
  step's data shape, list of Nigerian banks for the payout step.

**API endpoints**
- `app/api/driver/onboarding/save-step/route.ts` — POST body: `{step, data}`.
  Merges data into `driver_profiles.onboarding_state[step]`. Also updates
  `last_step_completed` so we can route drivers back to where they were.
- `app/api/driver/onboarding/upload/route.ts` — Multipart upload. Stores
  files at `{user_id}/{documentType}/{timestamp}-{filename}`. Returns
  both the storage path (for saving into state) and a 1-year signed URL
  (for preview). documentType is allow-listed.

**Wizard pages**
- `app/(driver)/driver/onboarding/layout.tsx` — Auth-gates the wizard, sends
  approved drivers to `/driver` instead.
- `app/(driver)/driver/onboarding/page.tsx` — Root router. Reads
  `onboarding_state.last_step_completed` and redirects to the appropriate
  next step. Submitted-but-not-approved → step-pending.
- `app/(driver)/driver/onboarding/step-start/page.tsx` — Welcome page
  with checklist of what they'll need.
- `app/(driver)/driver/onboarding/step-pending/page.tsx` — Post-submit
  page. Shows submit date + expected decision timeline.

**Fix**
- `app/(auth)/sign-up/driver/page.tsx` — Points at `/driver/onboarding`
  (not `/pending`) after signup completes.

## What's coming in later chunks

**Chunk 2** — Identity + Licence steps (uses DocumentUpload component)
**Chunk 3** — Address + Background + Experience steps
**Chunk 4** — Payout + Review + Submit endpoint

Each chunk should be applyable independently — you'll get one 404 at the
next unbuilt step, but the wizard shell keeps working.

## Bug fixes I want to add later (post-chunk-4)

- The three signup endpoints (customer/corporate/driver) should call
  `fn_rebuild_user_claims` after inserting the role so JWTs pick up new
  claims without requiring a sign-out cycle. Currently `refreshSession()`
  on the client is enough IF the claim exists — but stale sessions from
  before the role was granted still need a sign-out.

## After you apply Chunk 1

Report the outcome of the test flow above. Once you confirm step-start
loads cleanly, I'll ship Chunk 2 (identity + licence).
