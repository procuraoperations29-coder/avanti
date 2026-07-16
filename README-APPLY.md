# Email OTP switchover

5 files. Swaps phone-based auth for email-based auth. Nigerian users
happily accept email — no SMS dependency, no Termii sender ID chase.

## Apply

```bash
cd ~/Downloads
unzip -o email-otp.zip -d /tmp/email-extract
cp -r /tmp/email-extract/email-otp/* ~/Desktop/Avanti/
```

That overwrites the four page files and two API routes. Then commit + push:

```bash
cd ~/Desktop/Avanti
git add -A && git commit -m "switch auth from phone otp to email otp" && git push
```

Vercel auto-redeploys.

## Also — patch the driver signup page

I don't have your driver signup page. But it uses the same phone-OTP
pattern as customer/corporate. Small patch — open:

```
app/(auth)/sign-up/driver/page.tsx
```

And find these two blocks:

**1.** Where it calls `/api/auth/otp/send`, change the body to send `email` instead of `phone`:

```typescript
// OLD:
body: JSON.stringify({ phone, isSignup: true, fullName, countryCode: 'NG' }),

// NEW:
body: JSON.stringify({
  email: email.trim(),
  isSignup: true,
  fullName,
  phone,
  countryCode: 'NG',
}),
```

**2.** Where it calls `/api/auth/otp/verify`:

```typescript
// OLD:
body: JSON.stringify({ phone, code }),

// NEW:
body: JSON.stringify({ email: email.trim(), code }),
```

**3.** Add an email field to the form. Copy the same email input block
from the customer signup page (in `app/(auth)/sign-up/customer/page.tsx`).
Add state: `const [email, setEmail] = useState('');`

**4.** Update the OTP-step heading from "Confirm your number" to
"Check your inbox". Change `{phone}` display to `{email}`.

## Admin migration — CRITICAL before you sign in

Your admin account (`3c010183-6dba-4f05-916c-e13342a4ae5b`) currently
authenticates via phone. After this switchover, phone auth stops
working. You need to add an email to your Supabase Auth record.

**Supabase Dashboard → SQL Editor:**

```sql
update auth.users
set email = 'procuraoperations29@gmail.com',
    email_confirmed_at = now()
where id = '3c010183-6dba-4f05-916c-e13342a4ae5b';
```

Substitute your real email. After this runs, you can sign in with that
email at `/sign-in` and Supabase will send the code.

## Disable the SMS hook

You don't need it any more:

1. Supabase Dashboard → Authentication → Hooks
2. Send SMS Hook → **Disable** (or delete)

Also clean up if you want — remove these Vercel env vars (optional):
- `TERMII_API_KEY`
- `TERMII_SENDER_ID`
- `SEND_SMS_HOOK_SECRET`

And you can delete `app/api/auth/sms-hook/route.ts` — it's dead code now.

## Optional — customize the email template

Supabase's default OTP email works but says "Confirm your signup." You
can polish it:

1. Supabase Dashboard → Authentication → Email Templates
2. Select **Magic Link** (this is the one that sends OTP codes too)
3. Customize the subject: `Your Avanti sign-in code`
4. Customize the body to mention Avanti and include `{{ .Token }}` for the code
5. Save

Do this later — not urgent.

## Test flow

1. `https://www.avanti.com.ng` incognito
2. Sign In → enter your admin email → Send my code
3. Check inbox — 6-digit code from Supabase within seconds
4. Enter code → signed in
5. Redirects to `/customer` or wherever your admin lands

Should work first try.

## Files shipped

- `app/api/auth/otp/send/route.ts` — email version
- `app/api/auth/otp/verify/route.ts` — email version
- `app/(auth)/sign-in/page.tsx` — email input
- `app/(auth)/sign-up/customer/page.tsx` — email required
- `app/(auth)/sign-up/corporate/page.tsx` — email required

Ship it.
