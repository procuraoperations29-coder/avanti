# Admin Verification Detail Fix

2 files. Fixes the "0 documents" + missing applicant info on the admin
verification detail page.

## What was wrong

**`fetchDriverForReview`** queried the `documents` table with column names
that don't exist on your schema:
- `kind` → should be `document_type`
- `filename` → doesn't exist (I synthesize from storage_path)
- `size_bytes` → should be `file_size_bytes`
- `uploaded_at` → should be `created_at`

The query failed silently, returned empty, admin saw 0 documents.

**Detail page** read from columns that don't exist on driver_profiles
(`years_experience`, `languages`, `vehicle_class_experience`,
`transmission_experience`, `service_radius_km`) — those live inside
`onboarding_state.experience` jsonb. Also used camelCase keys
(`state.licence.licenceNumber`) instead of snake_case (`licence_number`)
that the wizard writes.

## What ships

- `app/api/admin/verification/queue/route.ts` — Fixed `fetchDriverForReview`
  with correct column names, generates signed URLs directly from the
  bucket stored on each document row (respects `driver-documents` vs any
  future bucket).
- `app/(admin)/admin/verification/[driverId]/page.tsx` — Reads everything
  from `onboarding_state` jsonb. Adds sections for Identity, Address,
  Background (with all references listed), Experience, Payout. Documents
  render with reference number and expiry date visible.

## Apply

```bash
cd ~/Downloads
unzip -o admin-review.zip -d /tmp/admin-review-extract
cp -r /tmp/admin-review-extract/admin-review/* ~/Desktop/Avanti/
rm -rf /tmp/admin-review-extract ~/Desktop/Avanti/.next

cd ~/Desktop/Avanti
git add -A && git commit -m "fix admin verification detail: correct columns + read state jsonb" && git push
```

## Test

1. Wait for Vercel deploy
2. Sign in as admin, go to `/admin/verification`
3. Click into your submitted driver
4. Should now show:
   - **Applicant details** — name, phone, email, submitted date, availability
   - **Identity** — legal name, DOB, gender, ID type, ID number
   - **Licence** — number, class, issued, expires
   - **Address** — street, city, state, landmark
   - **Experience** — years, vehicle classes, transmissions, languages, night driving, smartphone, service radius
   - **Background** — criminal disclosure + two references with contact details
   - **Payout** — bank, account number, account holder
   - **Documents · 5** — grid of uploaded images with labels, reference numbers, expiry dates

Click any document — should open signed URL in new tab (image or PDF).

## After verifying it works

Approve the driver via the DecisionPanel component (bottom of page). Assign
a tier (t2/t3/t4). Should:
- Set verification_status to 'approved'
- Set verification_tier
- Record a verification_event
- Redirect / show success

The driver visits `/driver` — should now see their approved dashboard
(instead of onboarding).

## Report

1. Does the detail page now show all the sections with data?
2. Do the 5 document tiles render with previews?
3. Can you click through to approve?
