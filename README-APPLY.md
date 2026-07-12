# Slice 5 — Driver onboarding + admin verification

25 files. Adds the 8-step driver onboarding wizard, document upload to
Supabase Storage, and the admin verification queue with approve/reject/
more-info decisioning.

## Apply

1. Extract into your project root:
   ```
   cd ~/Downloads
   cp -r slice5/* ~/Desktop/Avanti/
   ```

2. Apply the new migration:
   ```
   cd ~/Desktop/Avanti
   supabase db push
   ```
   Answer Y when it lists `20260812000000_onboarding_storage.sql`.
   The migration creates the `driver-documents` Storage bucket and its
   RLS policies, and adds two columns to `driver_profiles`.

3. Regenerate types (picks up the new columns):
   ```
   supabase gen types typescript --linked > types/database.ts
   ```

4. Typecheck:
   ```
   pnpm typecheck
   ```

5. Restart the dev server:
   ```
   pnpm dev
   ```

6. Confirm the Storage bucket exists in the Supabase dashboard →
   **Storage** → left sidebar. You should see `driver-documents` listed as
   a private bucket.

7. Commit:
   ```
   git add .
   git commit -m "slice 5: driver onboarding + admin verification"
   git push
   ```

## Test end-to-end

### As a driver

- Sign up as a driver (or use your existing driver account) → lands at
  `/driver/onboarding/pending`
- Because the status is `not_started`, the page redirects to
  `/driver/onboarding` (the wizard)
- Walk through the 8 steps: Start → Identity → Licence → Address →
  Background → Experience → Payout → Review
- Upload real photos (or PDFs) at each document step; they appear as
  thumbnails once uploaded
- On Review, ensure all six checks are green
- Submit — you land back on `/driver/onboarding/pending` showing "under
  review"

### As an admin

To test this you need an account with the `admin_verifier` (or
`super_admin`) role. Two ways to give yourself the role:

**Option A — Supabase dashboard SQL editor:**
```sql
insert into user_roles (user_id, role)
values ('YOUR_USER_ID', 'admin_verifier');
```
Where `YOUR_USER_ID` is the uuid of one of your existing signed-up users
(look in `auth.users`).

**Option B — Sign up a fresh user with a different phone, then run the
same SQL against that user's id.**

After the role is assigned, sign out and sign back in as that user —
the JWT will now carry the admin_verifier role via the claim-shaping
trigger.

Then:
- Visit `/admin` → module cards render, verification queue shows count
- Click "Verification queue" → list of pending drivers
- Click a driver → their submission with documents, spec sheet, and the
  decision panel
- Pick Approve + a tier + rationale ≥10 chars → submit
- Driver's `verification_status` flips to `approved`, `verification_tier`
  moves to the chosen tier (via the Slice 2 trigger), and an audit_logs
  row is written (via serviceRoleWrite)
- The driver, if signed in and refreshing `/driver/onboarding/pending`,
  sees the approved state with their new tier

## What's in the zip

**Migration (1)**
- `supabase/migrations/20260812000000_onboarding_storage.sql`

**Library (3)**
- `lib/onboarding/steps.ts` — step definitions
- `lib/onboarding/schema.ts` — Zod schemas for draft + submission
- `lib/storage/upload.ts` — server-side Storage upload + signed URL helper

**API routes (5)**
- `app/api/driver/onboarding/state/route.ts` — GET/PUT draft
- `app/api/driver/onboarding/documents/route.ts` — POST/GET/DELETE docs
- `app/api/driver/onboarding/submit/route.ts` — POST submit
- `app/api/admin/verification/queue/route.ts` — GET queue (+ helper)
- `app/api/admin/verification/[driverId]/decide/route.ts` — POST decision

**Driver pages + components (11)**
- `app/(driver)/onboarding/page.tsx` — wizard entry
- `app/(driver)/onboarding/pending/page.tsx` — status-aware landing
- `components/driver/document-upload.tsx` — reusable file picker
- `components/driver/onboarding/wizard.tsx` — wizard shell
- 8 step components under `components/driver/onboarding/steps/`

**Admin pages + components (5)**
- `app/(admin)/admin/page.tsx` — admin home with module cards
- `app/(admin)/admin/verification/page.tsx` — queue list
- `app/(admin)/admin/verification/[driverId]/page.tsx` — review + decide
- `components/admin/decision-panel.tsx` — approve/reject/more-info form

## Key architectural notes

- **State model**: the wizard runs client-side. Draft state persists in
  `driver_profiles.onboarding_state` (jsonb) via PUT to
  `/api/driver/onboarding/state` on every step transition. Cross-device
  continuation works because state lives on the server.

- **Document upload**: multipart POST → server computes SHA-256, uploads
  to Supabase Storage with a path like
  `driver-documents/{user_id}/{kind}/{timestamp}-{filename}`. RLS on
  `storage.objects` restricts uploads to your own folder and reads to
  yourself + admin_verifier/compliance/super_admin.

- **Submit path**: `/api/driver/onboarding/submit` validates the entire
  state with `submitReadinessSchema` (strict — every required field
  must be present), writes profile fields, inserts `driver_payout_methods`,
  and creates a `verification_events` row with `event_type='submitted'`.
  The Slice 2 trigger `fn_apply_verification_event` flips
  `verification_status` to `submitted`.

- **Decision path**: `/api/admin/verification/[driverId]/decide` goes
  through `serviceRoleWrite` (Slice 3b) — re-verifies the actor has
  `verification.decide`, requires ≥10-char rationale, writes an
  audit_logs row alongside the verification_events insert. Tier moves
  automatically via the trigger when `event_type='approved'` and
  `to_tier` is set.

- **No image compression yet**: client-side image compression (to keep
  African mobile bandwidth in mind) is deferred. Add
  `browser-image-compression` in a small follow-up.

- **No admin decision-page image compression yet**: images render at
  full storage resolution. For large PDFs / scans this is fine on
  desktop-first admin usage.

## Deferred to later slices

- **Real background check integration** — the consent step only records
  consent. Actual API call to a background-check provider (e.g. Prembly
  or Youverify for Nigeria) is a separate integration slice.
- **Push notifications on decision** — admin decision doesn't yet notify
  the driver. The notification pipeline lands in Slice 7 (or wherever
  notifications end up).
- **Client-side image compression** — small, ship-later.
- **Bulk decision + queue filtering** — admin queue is flat + FIFO;
  filters / bulk actions later.

## What's next

**Slice 6 — Customer booking.** Real pricing engine reading rate cards,
search, driver profile dossier, book flow, contract generation,
Paystack integration.

Or a small follow-up: **image compression + notifications** as a polish
slice.
