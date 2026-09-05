# Setup

From an empty machine to a running LOCK, then to a deployment. Fifteen minutes,
most of it waiting for Supabase to provision.

---

## 1. Local

**Node 20.9 or newer.** Check with `node --version`. Next.js 16 will not run on
anything older, and `npm install` now refuses rather than letting you find out
from a stack trace later.

```bash
npm install
cp .env.example .env.local
npm run dev
```

It starts without Supabase. The entry page will say **"Not configured"** — that
is the app telling you the truth, not an error. `.env.local` is git-ignored and
is never in a clone, so this is what a fresh checkout always shows until you do
step 2.

---

## 2. Supabase

### Create the project

[supabase.com/dashboard](https://supabase.com/dashboard) → **New project**. Pick
a region near you and save the database password somewhere; you will not be
shown it again.

### Copy the keys

**Project Settings → API**, into `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<the anon / public key>
```

The anon key is safe in the browser: it grants exactly what Row Level Security
allows, and every table here has RLS on with no permissive policy.

**Do not copy the `service_role` key.** Nothing in this codebase reads it. It
bypasses RLS entirely, and a key that appears in an `.env` file eventually
appears somewhere else.

### Apply the schema

**SQL Editor → New query**, paste each migration in `supabase/migrations/` in
filename order and run it:

1. `20260901000000_foundation.sql` — the schema, roles, policies and privileges.
2. `20260905000000_oauth_display_names.sql` — teaches the signup trigger to read
   a name from an OAuth provider (`full_name` / `name`), which is what Google
   sends. Safe to run on a project that already has the first one; it replaces
   one function and touches no data.

With the CLI instead:

```bash
supabase link --project-ref <project-ref>
supabase db push
```

Confirm it took: **Table Editor** shows `profiles`, and its RLS badge says
enabled.

### Auth settings

**Authentication → URL Configuration**:

- **Site URL** — `http://localhost:3000` locally, your real origin in production.
- **Redirect URLs** — add both, exactly:
  - `http://localhost:3000/auth/callback`
  - `https://<your-domain>/auth/callback`

That path is not optional. `@supabase/ssr` uses PKCE, so both a Google sign-in
and a confirmation email come back with a `code` that must be exchanged for a
session on the server. Without the redirect allowed, the round trip completes
and lands nowhere.

#### Turn email confirmation OFF

**Authentication → Sign In / Providers → Email → Confirm email — switch it off.**

This is a real decision, not a shortcut, and it is the right one for LOCK as it
stands:

- No SMTP provider is configured, so the only sender available is Supabase's
  shared one. It is capped at a couple of messages an hour and is routinely
  undelivered — an account created this way waits on an email that never
  arrives, and there is no way through from the app.
- LOCK is private. Email confirmation exists to prove that whoever typed an
  address controls it, which matters when strangers can sign up. Here the
  accounts are made by the person who owns the project, and signups are closed
  the moment they exist.

With it off, creating an account signs you straight in. If you leave it on, the
signup form says so explicitly rather than pretending to have sent something —
and an account already stuck that way can be confirmed by hand under
**Authentication → Users**.

When LOCK later needs real email — password resets, invitations — the answer is
an SMTP provider under **Project Settings → Authentication → SMTP Settings**,
and confirmation can be switched back on in the same change.

Restart `npm run dev` after editing `.env.local` — `NEXT_PUBLIC_` values are
inlined at build time and a running server will not pick them up.

---

## 2b. Google sign-in

Optional, and entirely configuration: no code changes, and no credentials in
this repository. Google's client secret lives in Supabase, which is the only
place it belongs — it is never sent to a browser and never read by this app.

Skip this and everything else still works; the button simply reports that the
provider is not enabled.

### In Google Cloud

[console.cloud.google.com](https://console.cloud.google.com) → create or select
a project.

1. **APIs & Services → OAuth consent screen**
   - **External** for a personal Google account; **Internal** if you have Google
     Workspace and only your own domain will sign in.
   - App name (`LOCK`), user support email, developer contact email. Save.
   - While the consent screen is in **Testing**, only listed test users can sign
     in — add your own address under **Audience → Test users**, or you will be
     refused by Google before Supabase is ever reached.
2. **APIs & Services → Credentials → Create credentials → OAuth client ID**
   - Application type: **Web application**.
   - **Authorized JavaScript origins**:
     - `http://localhost:3000`
     - `https://<your-domain>` (when you deploy)
   - **Authorized redirect URIs** — this one matters more than any other line in
     this document:

     ```
     https://<project-ref>.supabase.co/auth/v1/callback
     ```

     **Supabase's callback, not the app's.** Google redirects to Supabase;
     Supabase then redirects to `/auth/callback` in LOCK. Putting
     `http://localhost:3000/auth/callback` here is the single most common
     mistake and produces `redirect_uri_mismatch` at Google's screen.
3. Copy the **Client ID** and **Client secret**.

### In Supabase

**Authentication → Sign In / Providers → Google**:

- Toggle **Enable Sign in with Google** on.
- Paste the **Client ID** and **Client Secret**.
- Leave the callback URL Supabase shows you as it is — that is the value you
  already pasted into Google.
- Save.

Nothing else. LOCK reads no Google credentials; `signInWithGoogle` in
`src/lib/auth/actions.ts` asks Supabase for the authorization URL and Supabase
holds the secret.

### If signups are closed

Closing signups (below) closes Google too: a Google sign-in for an address with
no account *is* a signup. LOCK reports that case as "That Google account has no
access to LOCK, and new accounts are closed" rather than as a generic failure.
So enable Google and sign in once with each address **before** closing signups,
or reopen them briefly to add somebody.

---

## 3. Create the accounts

Go to `/signup`. Either way in works, and both produce the same kind of account:

- **Continue with Google** — one click, no password, and the name on the profile
  comes from your Google account.
- **Email and password** — with confirmation switched off as above, creating the
  account signs you straight in.

Every account starts as a `learner`. That is enforced by the database, not by
the form: the `role` column defaults to `learner`, no client holds the privilege
to write it, and the signup trigger deliberately ignores a role in the metadata
whether it came from our form or from Google's claims.

### Promote an account to mentor or admin

Roles are not writable through the API by anybody, including admins. That is
deliberate — see [ARCHITECTURE.md](ARCHITECTURE.md#roles-and-authorization).
Change one with SQL, in the **SQL Editor**:

```sql
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'you@example.com');
```

`'mentor'` for a mentor. Check it landed:

```sql
select u.email, p.role
from public.profiles p
join auth.users u on u.id = p.id
order by p.created_at;
```

Sign out and back in to see the change — the role is read per render, so a
refresh is enough, but signing in again removes all doubt.

### Close signups

LOCK is private. Once the accounts exist:

**Authentication → Sign In / Providers → Email → Allow new users to sign up**,
off.

The `/signup` page then answers "New accounts are closed." That is the gate —
there is no invite code in this codebase, deliberately. An admin who invites
people belongs in Prompt 6.

---

## 4. Verify

```bash
npm run check       # typecheck, lint, unit tests, production build
npm run test:db     # the RLS suite — needs local PostgreSQL 16+ and psql
```

`test:db` runs against a throwaway local database, never your Supabase project.
Point it at a specific server with `LOCK_TEST_PGHOST` / `LOCK_TEST_PGUSER` if
`psql` does not connect by default.

By hand, in the browser:

1. `/dashboard` while signed out → sent to `/login?next=%2Fdashboard`
2. Sign in with email and password → back to `/dashboard`, not the entry page
3. Sign out, then **Continue with Google** → Google's account chooser, then
   `/dashboard`
4. Cancel at Google's consent screen → back on `/login` reading "Sign-in was
   cancelled. Nothing happened to your account."
5. `/admin` as a learner → "This section is not for your account"
6. `/admin` as an admin → the section placeholder
7. The mentor and admin links are absent from the sidebar for a learner

---

## 5. Deploy

Vercel, or anything that runs Next.js. Nothing here depends on Vercel.

Set three variables in the deployment's environment:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Same as local |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same as local |
| `NEXT_PUBLIC_SITE_URL` | `https://your-domain` — no trailing slash, include the scheme |

`NEXT_PUBLIC_SITE_URL` matters more than it looks. The server can fall back to
`VERCEL_URL`, but the browser cannot — it is not a `NEXT_PUBLIC_` variable — so
without it a deployed build sends confirmation emails pointing at localhost.

Then, in Supabase: add the production origin to **Site URL** and its
`/auth/callback` to **Redirect URLs**.

---

## Troubleshooting

**"LOCK is not connected to a database yet."** `.env.local` is missing, empty,
or the server was not restarted after it was written.

**Signed in, then immediately signed out again.** The proxy is not running.
`src/proxy.ts` must be at `src/proxy.ts` — Next.js 16 renamed the file from
`middleware.ts` and will not find it anywhere else.

**The confirmation link lands on the login page.** `/auth/callback` is not in
Supabase's Redirect URLs, or `NEXT_PUBLIC_SITE_URL` does not match the origin
the link was generated for.

**"You are signed in, but this account has no profile."** The migration has not
been applied, or `on_auth_user_created` is missing — the account was created
before the trigger existed. Delete the account in **Authentication → Users** and
sign up again, or insert the profile by hand.

**A role change does nothing.** You updated `auth.users`, not
`public.profiles`. The role lives on the profile.

**Google says `redirect_uri_mismatch`.** The Authorized redirect URI in Google
Cloud must be `https://<project-ref>.supabase.co/auth/v1/callback` — Supabase's,
not the app's. See section 2b.

**Google says `access_blocked` or "app has not completed verification".** The
consent screen is in Testing and your address is not a test user. Add it under
**OAuth consent screen → Audience → Test users**.

**"Google sign-in is not enabled on this Supabase project yet."** The provider
toggle is off, or the client ID and secret were not saved.

**Google signs me in as the wrong account.** It should not — LOCK asks for the
account chooser every time. If it does, you are signed into that account in the
browser; pick the other one at the chooser.

**A Google sign-in lands back on `/login` saying it could not be completed.**
`http://localhost:3000/auth/callback` is missing from **Redirect URLs** in
Supabase, or the browser that finished the flow is not the one that started it
— the PKCE verifier is a cookie and does not travel between browsers.

**Two accounts for one person.** Supabase links a Google identity to an existing
email account only when that email is confirmed. Signing up with a password and
later using Google on the same address can otherwise produce a second account.
For LOCK, pick one method per person.
