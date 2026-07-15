# Onboarding step 06 — Availability

3 new files. Adds a dedicated availability step between Experience and
Payout in the driver onboarding wizard. Driver picks whether they take
on-demand jobs, permanent placements, or both. Persists directly to
`driver_profiles.available_on_demand` and `available_permanent`.

## Apply

**Step 1 — Extract:**

```bash
cd ~/Downloads
unzip -o availability-step.zip -d /tmp/avail-extract
cp -r /tmp/avail-extract/avail-step/* ~/Desktop/Avanti/
rm -rf /tmp/avail-extract ~/Desktop/Avanti/.next
```

**Step 2 — Update the Experience step's "Continue" link.**

Open the file:

```
app/(driver)/driver/onboarding/step-experience/page.tsx
```

or wherever the "Continue" button lives (may be in a child form component).
Find the link/button that navigates forward. It currently goes to:

```
/driver/onboarding/step-payout
```

Change to:

```
/driver/onboarding/step-availability
```

**Step 3 (optional) — Renumber the Payout step display.**

If the payout step page has its ordinal display as `06`, bump it to `07`
so the numbering stays sequential. Look for something like:

```tsx
<div className="mb-2 font-display text-8xl leading-none text-brass md:text-9xl">
  06
</div>
```

Change `06` → `07`. Also update its "Step 06 of X" caption if present.

**Step 4 — Restart:**

```bash
cd ~/Desktop/Avanti
pnpm dev
```

Commit:

```bash
git add app/\(driver\)/driver/onboarding/step-availability \
        app/api/driver/onboarding/availability \
        app/\(driver\)/driver/onboarding/step-experience
git commit -m "onboarding: add availability step between experience and payout"
git push
```

## Test

1. Start a fresh driver onboarding (or use existing driver in-progress)
2. Complete steps up to Experience
3. Click "Continue" from Experience → should land at
   `/driver/onboarding/step-availability`
4. Two option cards: **On-demand** (ink border) and **Permanent placement**
   (brass border)
5. Try clicking both off → error banner appears, Continue disabled
6. Pick one or both → Continue enabled
7. Click Continue → saves to `driver_profiles`, redirects to
   `/driver/onboarding/step-payout`
8. Verify in SQL:

```sql
select available_on_demand, available_permanent
from driver_profiles
where user_id = auth.uid();
```

## Files shipped

- `app/(driver)/driver/onboarding/step-availability/page.tsx` — server
  component, editorial voice with ordinal 06, brass info banner explaining
  the pay model
- `app/(driver)/driver/onboarding/step-availability/availability-form.tsx`
  — client component with two option cards, save + continue button
- `app/api/driver/onboarding/availability/route.ts` — POST endpoint,
  writes both boolean columns

## What's not in this delivery (optional follow-ups)

- **Update the review step** to display the availability choice in the
  summary. If your `step-review/page.tsx` reads onboarding state and
  displays it, add a line for availability. Small edit.
- **Update wizard shell** if you have a step-count in the URL or a
  progress bar that reads a step list constant. Add 'availability' to
  the list between 'experience' and 'payout'.
- **Backfill existing drivers** — anyone who onboarded before this step
  existed has whatever the column defaults are (on_demand=true,
  permanent=false). They can change via the toggle on `/driver` home.

Fine to defer all three. The core step works standalone.
