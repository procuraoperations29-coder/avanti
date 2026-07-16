# Onboarding Chunk 2 — Identity + Licence

5 files. Adds the first two document-uploading steps of the wizard.

## Apply

```bash
cd ~/Downloads
unzip -o onboard-chunk-2.zip -d /tmp/onboard2-extract
cp -r /tmp/onboard2-extract/onboard2/* ~/Desktop/Avanti/
rm -rf /tmp/onboard2-extract ~/Desktop/Avanti/.next

cd ~/Desktop/Avanti
git add -A && git commit -m "onboarding chunk 2: identity + licence" && git push
```

No new migration. Uses existing storage bucket + save-step endpoint from Chunk 1.

## Test after Vercel finishes

1. Sign in as the driver from your last test signup
2. Navigate to `/driver/onboarding/step-identity` (or just `/driver/onboarding` — it'll route you)
3. Fill in legal name, DOB, gender, ID type, ID number
4. Upload front photo of your ID (a picture of any doc for testing)
5. Optionally upload the back
6. Click Continue → lands on `/driver/onboarding/step-licence`
7. Fill in licence details, upload both sides
8. Click Continue → lands on `/driver/onboarding/step-address`
9. **404** — expected. Address step ships in Chunk 3.

## Verify saves worked

```sql
SELECT onboarding_state FROM driver_profiles
WHERE user_id = 'YOUR_DRIVER_USER_ID';
```

Should see `identity` and `licence` objects populated with the data you entered, plus storage paths for the uploaded images.

## Verify uploads landed in storage

Supabase Dashboard → Storage → `onboarding-documents` bucket. You should see:
- `{user_id}/id_front/{timestamp}-{filename}.jpg`
- `{user_id}/licence_front/{timestamp}-{filename}.jpg`
- `{user_id}/licence_back/{timestamp}-{filename}.jpg`

## Files shipped

- `components/driver/onboarding/wizard-header.tsx` — Reusable header block used by every step (giant ordinal + label + back link)
- `app/(driver)/driver/onboarding/step-identity/page.tsx` — Server component, loads saved data
- `app/(driver)/driver/onboarding/step-identity/identity-form.tsx` — Client form with pill toggles, ID upload
- `app/(driver)/driver/onboarding/step-licence/page.tsx` — Server component
- `app/(driver)/driver/onboarding/step-licence/licence-form.tsx` — Client form with licence class picker, expiry warning, front+back upload

## Design decisions

- **Uploads happen immediately** — as soon as the driver picks a file, it's uploaded to storage. The path is stored in state, not the file itself
- **Expiry date validation is inline** — red border + warning message if the licence expiry is in the past. Continue button disables
- **Pill toggles for enums** — cleaner than dropdowns for 2-4 options (gender, ID type, licence class)
- **Auto-uppercase on licence numbers** — Nigerian licence numbers are always uppercase, saves a typo
- **Back of ID is optional; back of licence is required** — matches Nigerian document conventions

## Coming in Chunk 3

Next chunk: Address, Background (with references), Experience. All non-file-heavy steps except the utility bill in Address.

Report:
1. Did upload work?
2. Did identity + licence save?
3. Did continue take you to the (404) address step?

Once confirmed, I ship Chunk 3.
