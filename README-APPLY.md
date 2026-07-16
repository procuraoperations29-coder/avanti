# Onboarding Chunk 4 — Payout + Review + Submit (final chunk)

6 files. Closes out the onboarding wizard end-to-end.

## Apply

```bash
cd ~/Downloads
unzip -o onboard-chunk-4.zip -d /tmp/onboard4-extract
cp -r /tmp/onboard4-extract/onboard4/* ~/Desktop/Avanti/
rm -rf /tmp/onboard4-extract ~/Desktop/Avanti/.next

cd ~/Desktop/Avanti
git add -A && git commit -m "onboarding chunk 4: payout, review, submit" && git push
```

Note: this OVERWRITES `app/(driver)/driver/onboarding/page.tsx` with an updated
version that handles the new steps. Same file, wider routing table.

## Test after Vercel finishes

Full end-to-end run:

1. Sign in as your test driver (or fresh signup)
2. Complete: start → identity → licence → address → background → experience → availability
3. Payout: select bank, enter 10-digit NUBAN account number, account holder name → Review
4. Review page: scroll through all sections, click Edit on any to jump back
5. Submit for review → toast "Submitted. Verification pending."
6. Full page reload → lands on `/driver/onboarding/step-pending`
7. That page shows "Thanks. We've got it." + submission date + "Within 24 hours"

## Verify

```sql
SELECT 
  verification_status, 
  onboarding_submitted_at,
  onboarding_state->'payout'->>'bank_name' AS bank
FROM driver_profiles 
WHERE user_id = 'YOUR_DRIVER_USER_ID';
```

Should show `verification_status='submitted'`, timestamp populated, bank name filled.

```sql
SELECT * FROM driver_payout_methods 
WHERE driver_id = (
  SELECT id FROM driver_profiles WHERE user_id = 'YOUR_DRIVER_USER_ID'
);
```

Should show one row with `is_verified=false`, `is_default=true`, matching the payout data.

## After submission — where the driver goes

- Visits `/driver/onboarding` → redirects to `/driver/onboarding/step-pending`
- Visits `/driver` → your driver home page (should show a "verification pending" banner)

## Admin verification queue

Your admins can now see the pending driver at `/admin/verification` (or wherever
your verification dashboard lives from Slice 2). They review:
- Documents (uploaded to `driver-documents` bucket)
- Onboarding state (jsonb on driver_profiles)
- Payout method (unverified until admin approves)

Approving them sets `verification_status='approved'` and `verification_tier`
(t2/t3/t4/t5 based on Slice 2 rubric).

## Files shipped

- `app/(driver)/driver/onboarding/step-payout/page.tsx` + `payout-form.tsx`
  — Bank dropdown from NIGERIAN_BANKS constant, NUBAN account number,
  account holder name
- `app/(driver)/driver/onboarding/step-review/page.tsx` + `review-client.tsx`
  — Summary of every section, Edit links, missing-data warning, Submit button
- `app/api/driver/onboarding/submit/route.ts` — Validates completeness,
  creates driver_payout_methods row, sets verification_status='submitted'
- `app/(driver)/driver/onboarding/page.tsx` — Updated root router to
  handle payout→review and review→pending

## Design decisions

- **Bank list is hardcoded** in `lib/onboarding/state.ts` — no Paystack
  bank list API call. Simpler for launch. Add Paystack lookup later for
  live account validation.
- **Account validation is deferred** — we don't hit Paystack's resolve
  account endpoint at submit time. Admin verifies during review. If it
  becomes a support burden, wire up Paystack validate at continue-time.
- **driver_payout_methods gets an insert** — even though unverified, the
  data is now relational, not just sitting in jsonb. Admin verification
  flips `is_verified` to true.
- **Idempotent submit** — clicking submit twice doesn't break anything;
  second call returns `alreadySubmitted: true`.
- **Missing-data check is client-side AND server-side** — client for UX
  (grey out submit), server for security (returns 400 with list).

## Post-Chunk 4 backlog (not blocking)

- Patch customer + corporate signup endpoints to call `fn_rebuild_user_claims`
  (already done for driver in Chunk 1's signup patch)
- Landing page footer: WhatsApp support + email
- Terms + Privacy pages (Termly generated)
- Admin verification queue polish (Slice 2 shipped this — check it renders)
- First real driver sign-up → you review → approve

## Report

Once tested end-to-end, tell me:
1. Did the full flow work start-to-finish?
2. Did the review page show all sections correctly?
3. Did submit flip verification_status to 'submitted'?
4. Did step-pending show the "Thanks, we've got it" page?

If yes to all four, the driver onboarding wizard is complete.
