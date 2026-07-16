# Onboarding Chunk 3 — Address + Background + Experience

6 files. The three middle steps of the wizard. No new API endpoints or
migrations — uses save-step from Chunk 1.

## Apply

```bash
cd ~/Downloads
unzip -o onboard-chunk-3.zip -d /tmp/onboard3-extract
cp -r /tmp/onboard3-extract/onboard3/* ~/Desktop/Avanti/
rm -rf /tmp/onboard3-extract ~/Desktop/Avanti/.next

cd ~/Desktop/Avanti
git add -A && git commit -m "onboarding chunk 3: address, background, experience" && git push
```

## Test after Vercel finishes

1. Sign in as your test driver (or fresh signup — up to you)
2. Navigate through: identity → licence → **address**
3. Fill street, city, state, optional landmark, upload proof of address
4. Continue → **background**
5. Fill two references (name, phone, relationship, years known each)
6. Answer criminal disclosure Yes/No
7. Continue → **experience**
8. Fill years, vehicle classes (multi), transmissions (multi), languages (multi), night driving, smartphone, service radius
9. Continue → **step-availability**

Availability already existed in your repo — you should see it load without 404.

10. Fill availability → Continue → **step-payout** (404 — expected, Chunk 4)

## Verify saves worked

```sql
SELECT onboarding_state FROM driver_profiles
WHERE user_id = 'YOUR_DRIVER_USER_ID';
```

Should have `identity`, `licence`, `address`, `background`, `experience` all populated.

## Files shipped

- `app/(driver)/driver/onboarding/step-address/page.tsx` + `address-form.tsx`
  — Nigerian state dropdown, utility bill upload
- `app/(driver)/driver/onboarding/step-background/page.tsx` + `background-form.tsx`
  — Two reference blocks with name/phone/relationship/years, criminal disclosure
- `app/(driver)/driver/onboarding/step-experience/page.tsx` + `experience-form.tsx`
  — Multi-select pill toggles for vehicle classes, transmissions, languages;
  yes/no toggles for night driving and smartphone; service radius km input

## Design decisions

- **References are two hard-coded blocks** — you asked for two references
  minimum. Simpler UX than a dynamic add-more form. If they need more, we
  can add later.
- **Criminal disclosure** — pill Yes/No, with an explanation textbox that
  only appears if Yes. Not a blocker, just recorded honesty.
- **Vehicle classes are multi-select** — drivers can drive multiple types.
  Determines their matchable jobs.
- **Service radius** — defaults to 25km. Drivers set what they're willing
  to travel for a booking.
- **English pre-selected in languages** — most Nigerian drivers speak it
  anyway; can be unchecked.

## Coming in Chunk 4

Last chunk: payout step (bank details), review step (summary of everything),
submit endpoint (sets `verification_status='submitted'`, moves them to
step-pending). Once shipped, the wizard is complete end-to-end.

## Report

After you test:
1. Did address save with utility bill upload?
2. Did background save with two references and disclosure?
3. Did experience save?
4. Did continue take you to step-availability (which should already work)?

Once confirmed, I ship Chunk 4 to close out the onboarding wizard.
