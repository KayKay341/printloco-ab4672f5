

# Plan: Full demo mode for public + admin-gated production + waitlist emails

## Access model

```text
Route                Public (demo mode)        Admin (logged in)
/                    full demo browse          full real
/printers            full demo browse          full real
/upload              upload + slice + book*    upload + slice + real book
/dashboard           sample demo dashboard     real dashboard
/new-printer         demo form (no save)*      real save
/waitlist            real signup               real signup
/invest              real signup               real signup
/admin               redirect to /             full admin console
/auth                full                      full

* Demo actions show a friendly toast: "You're in demo mode — sign in as
  admin to make this real" and skip the real DB/Stripe call.
```

The entire site is browsable by the public as a polished demo. Nothing is gated behind a wall. Real money, real maker onboarding, real admin tools require admin login.

## What gets built

**1. Roles + admin login**
- `app_role` enum (`admin`, `user`) + `user_roles` table + `has_role()` security-definer function
- Seed your account as the first admin (need your email)
- `useIsAdmin()` hook reads role on auth change

**2. Demo mode context**
- `<DemoModeProvider>` wraps the app. Default state: `isDemo = !isAdmin`
- Exposes `isDemo`, `demoToast()` helper
- Gates write actions: checkout, printer create, profile updates → show toast instead of executing

**3. Demo data layer**
- New table `cities` (name, slug, status, launch_date, signup_count)
- Seed 6 sample printers, 3 sample makers, 4 cities, sample order history — visible to everyone via existing RLS (`Printers are viewable by everyone`)
- Demo dashboard shows sample orders/messages when `isDemo`

**4. Beefed-up `/waitlist`**
- Hero + signup form
- "What is PrintLoco" 3-sentence explainer
- "How it works" — Upload → Match → Pickup (with icons)
- "Who it's for" — makers vs customers split
- City picker with launch ETA pulled from `cities` table
- FAQ accordion (cost, materials, safety, payouts)
- Post-signup state: shows personal referral link + share buttons
- Add `referral_code` (unique) + `referred_by` columns to `waitlist_signups`

**5. Email automation**
- Set up Lovable email infrastructure (requires sender domain — see questions)
- `waitlist-confirmation` template: branded welcome + manifesto + 3-step product overview + city ETA + personal referral link
- `city-launch-announcement` template: "Your city is live" + CTA to upload first STL
- Trigger confirmation email immediately on `/waitlist` form submit

**6. `/admin` console (admin-only)**
- Cities table with signup counts + status dropdown (waitlist / launching / live)
- "Send launch announcement" button per city → calls `notify-city-waitlist` edge function
- Grant/revoke admin role by email
- View waitlist signups + investor leads

**7. Sample announcement copy** (delivered in chat after build)
- Twitter thread, LinkedIn post, outreach email, Reddit post for r/3Dprinting

## Technical notes

- All edge function writes (`create-checkout`, future admin endpoints) check `has_role(uid, 'admin')` and reject demo users at the server boundary — toast on the client is UX, server check is security.
- `notify-city-waitlist` edge function loops the city's signups and enqueues one email per recipient via the email queue (handles rate limits + retries automatically).
- Demo data is seeded as real DB rows owned by a synthetic "demo maker" account, so existing RLS keeps working without changes. We can flag/exclude these rows in admin views.

## Out of scope (flag for later)

- Auto-send launch emails when a city flips to "live" (current scope is manual admin trigger)
- Two-email drip sequence
- Public referral leaderboard
- Email open/click analytics

## Need from you before build starts

1. **Sender domain** — pick one:
   - Use Lovable's default sender (`noreply@lovable.app`) — works instantly, less branded
   - Use a subdomain of a domain you already own (e.g. `notify.yourdomain.com`) — branded, free, ~10 min DNS setup
   - Buy a new domain now and use it
2. **Your admin email** — the email you'll log in with, so I can grant your account the admin role in the seed migration

