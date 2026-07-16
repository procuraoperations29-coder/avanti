# Chunk 4 Fixes — availability columns + booleans-not-shown

3 files. Fixes:

1. **Review page** was querying non-existent `availability_preference` column.
   Now uses `available_on_demand` + `available_permanent` booleans that
   actually exist on driver_profiles.
2. **Submit endpoint** had the same bug — fixed to check both booleans
   (at least one must be true).
3. **Review client** was showing booleans as "No" when they were `undefined`
   (never answered). Now hides those rows entirely.

## Apply

```bash
cd ~/Downloads
unzip -o onboard-chunk-4-fix.zip -d /tmp/onboard4fix-extract
cp -r /tmp/onboard4fix-extract/onboard4-fix/* ~/Desktop/Avanti/
rm -rf /tmp/onboard4fix-extract ~/Desktop/Avanti/.next

cd ~/Desktop/Avanti
git add -A && git commit -m "fix: availability columns + hide unset booleans in review" && git push
```

## About your "nothing entered yet" issue

**Two possibilities:**

**A. Your onboarding_state actually IS empty.** Run this in Supabase:

```sql
SELECT onboarding_state, jsonb_object_keys(onboarding_state)
FROM driver_profiles 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'YOUR_TEST_DRIVER_EMAIL');
```

If it returns nothing or `{}`, the save-step endpoint is failing silently.
The data was never actually saved even though you filled the forms.

Test save-step directly by watching Vercel Runtime Logs while filling
step-identity and clicking Continue. Look for `/api/driver/onboarding/save-step`
requests. If they return 400/500, the trigger error is there.

**B. State has data but review isn't reading it.** After applying this fix,
review should read state correctly. Try the flow again.

## What to test

1. Fresh incognito, sign in as your test driver
2. Go to `/driver/onboarding`
3. Complete every step
4. **Watch Vercel Runtime Logs while doing this** — see if save-step calls
   return 200 or error
5. Land on review page
6. Should show all your data
7. Submit → step-pending

## Report

Paste the SQL result of the onboarding_state query. That tells us
whether A or B is happening. Then I can fix whichever it is.
