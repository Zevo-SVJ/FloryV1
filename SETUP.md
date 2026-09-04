# Setting up ShowMe

Everything that still needs your hands on it, in the order it needs doing.
The code is complete; what follows is account creation, keys, and three
settings in the Supabase dashboard.

**Time:** about 25 minutes to a working local instance, another 15 to deploy.

**You do not need:** Google Cloud, an OAuth client, an email marketing service,
an analytics vendor, a Stripe account, or an API key of any kind. ShowMe
authenticates with email and password only, and every embed provider it
supports (YouTube, Vimeo, Spotify, TikTok, Apple Music, SoundCloud) is a plain
iframe that needs no registration. See [Not applicable](#not-applicable) for why.

---

## Before you start

| Account | Needed for | Cost |
| --- | --- | --- |
| [Supabase](https://supabase.com) | Database, auth, file storage | Free tier is enough to test |
| [Vercel](https://vercel.com) | Hosting | Free tier is enough to test |
| A domain registrar | `showme.at`, or whatever you use | Only for launch, not for testing |
| An SMTP provider (Resend, Postmark, SES…) | Sending confirmation emails at launch | Free tiers exist; **not needed to test** |

Locally you need **Node 20 or newer** (`node -v`).

---

## 1 — Create the Supabase project

**Where:** https://supabase.com/dashboard → **New project**

1. Pick an organisation, name the project, and **save the database password
   somewhere** — you cannot see it again, and the CLI path in step 2 asks for it.
2. Choose the region closest to your creators.
3. Wait for provisioning (~2 minutes).

**Verify:** the project dashboard loads and shows "Project is healthy".

---

## 2 — Run the migrations

Ten SQL files under `supabase/migrations/`. They create every table, every Row
Level Security policy, the `page-media` storage bucket, the reserved-username
list, and the trigger that creates a profile when an account signs up.

**They must run in filename order.** Each builds on the last.

### Option A — SQL editor (no tooling)

**Where:** Supabase dashboard → **SQL Editor** → **New query**

Paste the contents of each file, in this order, running each before pasting the next:

```
20260101000000_foundation.sql
20260102000000_usernames_and_onboarding.sql
20260103000000_block_types.sql
20260103000001_editor_and_media.sql
20260104000000_design.sql
20260105000000_analytics.sql
20260106000000_block_types_growth.sql
20260106000001_growth.sql
20260107000000_hardening.sql
20260108000000_optimization.sql
```

### Option B — Supabase CLI (faster, repeatable)

**Where:** your terminal, in the repository root.

```bash
npm i -g supabase          # or: brew install supabase/tap/supabase
supabase login
supabase link --project-ref <your-project-ref>   # asks for the DB password from step 1
supabase db push
```

The project ref is in your project URL: `https://supabase.com/dashboard/project/<ref>`.

**Verify — all four should be true:**

- **Table Editor** lists `profiles`, `links`, `social_links`, `blocks`,
  `page_views`, `link_clicks`, `subscriptions`, `reserved_usernames`,
  `optimization_events`.
- **Storage → Buckets** shows `page-media`, marked public, 5 MB limit.
- **SQL Editor**, run this — it should return `0`:
  ```sql
  select count(*) from pg_tables
   where schemaname = 'public' and not rowsecurity;
  ```
- **SQL Editor**, run this — it should return `86`:
  ```sql
  select count(*) from public.reserved_usernames;
  ```

---

## 3 — Collect the three keys

**Where:** Supabase dashboard → **Project Settings** → **API**
(newer projects show this as **Project Settings → API Keys**)

| Copy this | Into this variable | Safe in the browser? |
| --- | --- | --- |
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` | Yes |
| `anon` / `public` key | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes — RLS is what grants access |
| `service_role` key | `SUPABASE_SERVICE_ROLE_KEY` | **No. Never prefix it with `NEXT_PUBLIC_`** |

The service-role key bypasses Row Level Security. It is used in exactly one
file — `src/lib/supabase/admin.ts` — and only ever to insert analytics events.
Leave it unset and everything works except that no views or clicks are recorded.

---

## 4 — Configure auth URLs

**Where:** Supabase dashboard → **Authentication** → **URL Configuration**

1. **Site URL** — `http://localhost:3000` for now; change it to your real
   domain at launch.
2. **Redirect URLs** — add every origin you will use, each with the callback path:

   ```
   http://localhost:3000/auth/callback
   https://your-project.vercel.app/auth/callback
   https://showme.at/auth/callback
   https://*-yourteam.vercel.app/auth/callback     ← optional, for preview deploys
   ```

**This path is not optional.** Supabase's SSR library uses the PKCE flow, so
every link it emails returns a one-time `code` that has to be exchanged for a
session by `/auth/callback`. A confirmation link pointed anywhere else produces
an account nobody can sign in to.

**Verify:** the list saves without an error and each entry ends in `/auth/callback`.

---

## 5 — Decide about email confirmation

**Where:** Supabase dashboard → **Authentication** → **Sign In / Providers** →
**Email** → *Confirm email*

This is the one setting that changes how signup behaves, and ShowMe handles
both ways.

| | Confirm email **off** | Confirm email **on** |
| --- | --- | --- |
| After signup | Straight into the dashboard | "Check your inbox…", username held |
| Needs SMTP (step 6) | No | Yes, for anything beyond a handful of accounts |
| Good for | **Testing** | **Launch** |

**Recommendation:** turn it **off** while you test, **on** before you launch.

**Verify (off):** sign up → you land on `/dashboard` immediately.
**Verify (on):** sign up → you see the "check your inbox" message → the email
arrives → clicking it lands you on `/dashboard`, signed in. If it bounces you
to `/login` with "that link has expired", step 4 is wrong.

---

## 6 — Custom SMTP *(launch only — skip for testing)*

**Where:** Supabase dashboard → **Project Settings** → **Authentication** →
**SMTP Settings**

Supabase's built-in email sender is rate-limited to a few messages per hour and
is explicitly not for production. With email confirmation on and no custom SMTP,
most of your signups will silently never receive their link.

Configure any provider (Resend, Postmark, SendGrid, SES). You will need:
sender email, sender name, host, port, username, password.

**Verify:** sign up with a real address on your deployed site and time how long
the email takes. Under a minute is healthy.

---

## 7 — Run it locally

**Where:** your terminal, repository root.

```bash
cp .env.example .env.local
# fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
# SUPABASE_SERVICE_ROLE_KEY (uncomment it), and leave NEXT_PUBLIC_SITE_URL
# as http://localhost:3000
npm install
npm run dev
```

**Verify, in this order:**

1. `http://localhost:3000` — the landing page renders.
2. `/signup` — type a username; the availability check answers as you type, and
   the address preview under the field shows `localhost:3000/<name>`.
3. Sign up. You reach `/dashboard` (or the inbox message, per step 5).
4. `/editor` — add a links block and a link, press **Save**.
5. `http://localhost:3000/<your-username>` — your page renders with the link.
6. Click the link. You are redirected out through `/go/<id>`.
7. `/dashboard/analytics` — after a few page loads and a click, Views and
   Clicks are non-zero. *(If they stay at zero, `SUPABASE_SERVICE_ROLE_KEY` is
   missing or wrong — that is the only thing that records events.)*
8. `/dashboard/optimize` — says "We're learning how your audience uses your
   page". That is correct: it refuses to make claims below 100 views.
9. Upload an avatar in the editor. If it fails, re-check that step 2 created
   the `page-media` bucket.
10. The callback route, without needing an email — these three should redirect
    as shown:

    ```bash
    curl -s -o /dev/null -w "%{redirect_url}\n" "http://localhost:3000/auth/callback"
    #   → http://localhost:3000/login

    curl -s -o /dev/null -w "%{redirect_url}\n" "http://localhost:3000/auth/callback?error=access_denied"
    #   → http://localhost:3000/login?notice=link-expired

    curl -s -o /dev/null -w "%{redirect_url}\n" "http://localhost:3000/auth/callback?code=x&next=https://evil.com"
    #   → http://localhost:3000/login?notice=link-expired   (never evil.com)
    ```

    If the host in those redirects is not the one you requested,
    `NEXT_PUBLIC_SITE_URL` is wrong.

---

## 8 — Deploy to Vercel

**Where:** https://vercel.com/new → import the repository.

Framework preset is detected as Next.js; the build command and output directory
need no changes.

**Settings → Environment Variables** — add all four, for **Production,
Preview and Development**:

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | from step 3 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | from step 3 |
| `SUPABASE_SERVICE_ROLE_KEY` | from step 3 |
| `NEXT_PUBLIC_SITE_URL` | `https://your-project.vercel.app` — no trailing slash |

> **Two things that bite here.**
>
> `NEXT_PUBLIC_SUPABASE_URL` is read **at build time** to allow your Storage
> hostname through `next/image`. If it is missing when the build runs, every
> avatar and uploaded image returns a 400 on the deployed site even though the
> variable is present at runtime. Add the variables *before* the first deploy,
> or redeploy after adding them.
>
> `NEXT_PUBLIC_SITE_URL` is effectively required on any deployment. The server
> can fall back to Vercel's `VERCEL_URL`, but the browser cannot see that
> variable, so client components fall back to `localhost:3000` — and a creator
> is shown an address that is not theirs.

Then go back to **step 4** and add your Vercel URL to Supabase's redirect list.

**Verify:** the deployed site loads, you can sign in, your avatar renders (not
a letter), and the address shown in the header matches the domain you are on.

---

## 9 — Point your domain

**Where:** Vercel → your project → **Settings** → **Domains** → add `showme.at`
and `www.showme.at`. Vercel then tells you exactly which records to create.

**Where:** your registrar's DNS panel — create the records Vercel gave you.
Typically:

| Type | Name | Value |
| --- | --- | --- |
| `A` | `@` | `76.76.21.21` |
| `CNAME` | `www` | `cname.vercel-dns.com` |

Use the values **Vercel shows you**, not these — they change.

Then update, in this order:

1. **Vercel** → `NEXT_PUBLIC_SITE_URL` = `https://showme.at` → **redeploy**
   (the variable is baked into the client bundle, so a redeploy is required).
2. **Supabase** → Authentication → URL Configuration → **Site URL** =
   `https://showme.at`, and add `https://showme.at/auth/callback` to Redirect URLs.

**Verify:** `https://showme.at` serves the site over HTTPS; `showme.at/<name>`
serves a creator page; the QR code in the share sheet encodes `showme.at/...`;
`https://showme.at/robots.txt` names the sitemap.

---

## 10 — Optional: unique-visitor estimates

**Where:** Vercel → Settings → Environment Variables

| Variable | Value |
| --- | --- |
| `ANALYTICS_SALT` | any long random string — `openssl rand -hex 32` |

Each event stores an HMAC of (address + user agent + profile) keyed by this
value **and today's date**. The address itself is never stored, and yesterday's
hashes cannot be linked to today's because the key rotates daily.

Leave it unset and the Visitors figure reads *"Not available here"* — an honest
answer, and better than a number invented from a per-instance random value that
would change on every deploy.

**Verify:** the Visitors tile on `/dashboard/analytics` shows a number rather
than a dash. **Do not change this value later** — doing so resets the estimate.

---

## Already configured — no action needed

| | Where it lives |
| --- | --- |
| Database schema, every table and column | `supabase/migrations/` |
| Row Level Security on all 9 tables, 30 policies | migrations; asserted by `npm run test:db` |
| `page-media` storage bucket, public reads, per-owner writes, 5 MB cap, image MIME allowlist | `20260103000001_editor_and_media.sql` |
| The trigger that creates a profile inside the signup transaction | `20260101000000_foundation.sql` |
| 86 reserved usernames (`admin`, `api`, `auth`, `login`…) | seeded by migration, mirrored in `src/lib/validation/reserved.ts` |
| Security headers (`nosniff`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy`), no `x-powered-by` | `next.config.ts` |
| Rate limits on signup, sign-in, username checks and link clicks | `src/lib/security/rate-limit.ts` |
| `robots.txt`, sitemap, canonical URLs, JSON-LD, generated OG images | `src/app/robots.ts`, `sitemap.ts`, `[username]/` |
| Country detection | reads `x-vercel-ip-country`, which Vercel sets for free — no database, no variable |
| Fonts | the `geist` npm package, self-hosted by `next/font`. No Google Fonts request |
| Embeds | plain iframes to public embed endpoints. No keys, no registration |

---

## Not applicable

**Google Cloud / OAuth clients / social sign-in.** ShowMe has no OAuth. The
only auth calls in the codebase are `signUp`, `signInWithPassword`, `signOut`
and `getUser` — email and password, nothing else. There is no provider to
register, no consent screen to configure, and no client secret to store. If you
want "Sign in with Google" later it is a Supabase provider plus a callback that
already exists, but nothing today depends on it.

**Stripe / payments.** The `subscriptions` table exists and grants nobody
anything. Nothing in the product charges, and no key is read.

**A separate analytics vendor.** Analytics are first-party, in your own
Postgres.

---

## Known gaps — decide before launch

These are working as built; none blocks testing. Each is a product decision
rather than a bug.

1. **No password reset.** There is no "forgot password" link, and
   `resetPasswordForEmail` is not called anywhere. A creator who forgets their
   password currently has no self-service route back in. Adding it is a page,
   an action, and a branch in the callback that already exists.

2. **Rate limits are per instance.** The limiter is an in-memory fixed-window
   counter, so a deployment running four Vercel instances effectively allows
   four times the configured rate. It stops scripts, not a distributed attack.
   Documented in `src/lib/security/rate-limit.ts`; the fix is a shared store.

3. **No Content-Security-Policy.** Deliberate, with the reasoning written out in
   `next.config.ts`: a real one needs a per-request nonce for Next's inline
   bootstrap and a `frame-src` list that must stay in step with the embed
   providers, and a policy that drifts breaks a creator's video silently in
   production.

4. **`showme.at/you` on the landing page** is brand copy and stays hard-coded.
   Everywhere a creator is shown *their own* address — the signup field, the
   header, the confirmation message, the dashboard, the QR code — it now comes
   from `NEXT_PUBLIC_SITE_URL`.

5. **Deleting an account** is not possible from the product. There is no
   `DELETE` policy on `profiles` and nothing calls it; removing a creator is a
   manual `delete from auth.users` in the SQL editor, which cascades to
   everything they own.

---

## Verifying the code itself

No credentials needed for any of these:

```bash
npm run typecheck   # TypeScript, strict
npm run lint        # ESLint
npm test            # 302 unit tests
npm run build       # production build
npm run check       # all four, in order
```

The database suite needs a local PostgreSQL 16+ and `psql`. It does **not**
need a Supabase project — `supabase/tests/00_supabase_shim.sql` recreates the
parts of Supabase the schema depends on:

```bash
npm run test:db     # 300 assertions across eight suites
```

**Current status, verified in this repository:** typecheck clean, lint clean
with zero warnings, 302/302 tests passing, production build succeeds, 300/300
database assertions passing.

---

## What could not be verified here

These need your credentials or an external account, and are the things to watch
on your first run-through:

| Not verified | Why | First place to look if it fails |
| --- | --- | --- |
| Signup against real Supabase Auth | No project available in this environment | The `on_auth_user_created` trigger — a failed signup with no profile means it did not run |
| The confirmation-email round trip | Needs a real inbox and SMTP | Step 4's redirect list |
| Image upload to real Storage | Needs a real bucket | Step 2's bucket verification, then the 5 MB / image-type limits |
| `next/image` serving a real Storage URL | Needs the host allowed at build time | Step 8's build-time note |
| Country data | Needs a request through Vercel's edge | Nothing to configure; it is absent locally by design |
| DNS and certificate issuance | Needs your registrar | Vercel's Domains panel reports the exact record mismatch |

Everything else in this repository has been exercised end to end against a real
PostgreSQL database running the real application code.
