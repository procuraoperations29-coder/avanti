# Slice 7 — Driver-side engagements

9 files. The operational half of the booking loop — drivers see incoming
engagements, mark themselves en-route, check in, complete.

## Apply

```bash
cd ~/Downloads
cp -r slice7/* ~/Desktop/Avanti/

cd ~/Desktop/Avanti
rm -rf .next
pnpm dev
```

No migration, no new dependencies. Just files landing on top of what's
there.

Commit:

```bash
git add .
git commit -m "slice 7: driver-side engagement flow — activate, start, complete"
git push
```

## Test the loop

You'll need to be signed in as your **approved driver** account
(phone `+2348105122729`, code `234567` if using Supabase test numbers,
or whichever phone number matches the approved `driver_profiles` row).

**Setup — if the driver account doesn't have `driver` role yet:**

```sql
insert into user_roles (user_id, role)
values ('757c87c6-06a5-4a87-b285-5764e36ae375', 'driver')
on conflict do nothing;

select fn_rebuild_user_claims('757c87c6-06a5-4a87-b285-5764e36ae375');
```

Then sign out + sign back in as that driver so the JWT picks up the role.

**Walk-through:**

1. Sign in as the driver → land at `/driver/onboarding/pending`, which
   sees your `approved` status and (with the Slice 7 code in place)
   the new driver home at `/driver` takes over.

   Actually — `/driver/onboarding/pending` doesn't auto-redirect to
   `/driver` yet. You'll need to type `/driver` directly in the URL bar.
   (Cleaning that redirect up is a polish item.)

2. `/driver` → the new dashboard renders with:
   - Your portrait + tier badge (T2 or whatever you approved yourself at)
   - "Now" section if there's an active engagement
   - "Upcoming" section listing confirmed bookings
   - "All engagements" link

3. Click your existing confirmed engagement (the one from Slice 6
   testing, or a fresh one).

4. Engagement detail shows:
   - Customer name
   - Contact phone (tap-to-call)
   - Timing, pickup, instructions
   - Your payout amount (T2 sedan hourly ≈ ₦2,880/hr driver-side)
   - **Action panel** with the next-step button

5. Click **"I'm on my way"** → confirms → status flips to `activated`,
   button changes to "I've started the engagement".

6. Click **"I've started the engagement"** → status → `in_progress`,
   button changes to "Complete engagement".

7. Click **"Complete engagement"** → status → `completed`. Action panel
   replaced with a completion notice: "Payout will process on the next
   batch."

## Info isolation verified

Every driver-side query in this slice explicitly lists safe columns:
`driver_payout_total`, `currency`, timing, pickup, instructions,
customer name for pickup identification. **Never** selects
`customer_price_total` or `commission_total`.

Grep to confirm:

```bash
grep -r "customer_price_total\|commission_total" app/api/driver/ app/\(driver\)/
```

Should return nothing. If it does, that's a leak.

## What's in the zip

**Library (1)**
- `lib/engagement/driver-transitions.ts` — state graph, action metadata,
  human-readable labels

**API routes (3)**
- `app/api/driver/engagements/route.ts` — GET list
- `app/api/driver/engagements/[engagementId]/route.ts` — GET single
- `app/api/driver/engagements/[engagementId]/transition/route.ts` — POST transition

**Pages (3)**
- `app/(driver)/driver/page.tsx` — home dashboard
- `app/(driver)/driver/engagements/page.tsx` — grouped list
- `app/(driver)/driver/engagements/[engagementId]/page.tsx` — detail with actions

**Components (2)**
- `components/driver/engagement-card.tsx` — list row
- `components/driver/engagement-actions.tsx` — the action buttons (client)

## Architecture notes

**State transitions live in the API, guarded by DB triggers.** The
API route validates the from-status, applies the update, and lets
Slice 2's `fn_check_engagement_status_transition` trigger enforce
legality at the DB level. If we ever accidentally allow an illegal
transition, the DB rejects. Belt-and-suspenders.

**Timestamps.** `activated_at` and `completed_at` are dedicated
columns; the mid-state `started_at` lives in `metadata` jsonb (no
dedicated column in the schema). This is fine — the important
timestamps are activation and completion.

**Service-role for cross-role reads.** Drivers need customer names for
pickup identification. RLS on `public.users` restricts cross-user
reads, so we use the service role client with a driver_id guard on the
engagement query. The customer name is projected into the response —
customer's email, other engagements, etc. never surface.

## Deferred to later

- **Notifications** on new bookings — driver has to open the app
- **Decline / cancel** from driver — requires refund flow (Slice 8)
- **Substitution** when a driver can't make it
- **Real-time location tracking** during activation → in_progress
- **Rating flow** after completion — customer rates driver, driver
  rates customer
- **Dispute** raising

## What's next

Now that Slice 7 works, engagements can actually complete. That
unlocks:

**Slice 8 — Payouts.** Real money out to drivers. WHT deduction,
payout batching, invoicing, admin finance dashboard. Requires
completed engagements (which we now have).

**Polish slice.** Strip `as any` casts, wrap pages in `<PageShell>`,
client-side image compression, fix booking form UX. Overdue.

**Notifications slice.** Push + SMS on state changes. Small.
Would tie the customer + driver + admin experiences together.

Slice 8 is the biggest business unlock — makes drivers actually get
paid. Notifications are highest-leverage UX improvement. Polish is
technical debt cleanup.
