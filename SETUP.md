# Setup

From an empty machine to a running LOCK, then to a deployment. Fifteen minutes,
most of it waiting for Supabase to provision.

---

## 1. Local

```bash
npm install
cp .env.example .env.local
npm run dev
```

It starts without Supabase. The entry page will say it has no database — that is
the app telling you the truth, not an error.

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

**SQL Editor → New query**, paste the whole of
`supabase/migrations/20260901000000_foundation.sql`, run it.

With the CLI instead:

```bash
supabase link --project-ref <project-ref>
supabase db push
```

Confirm it took: **Table Editor** shows `profiles`, and its RLS badge says
enabled.

### Auth settings

**Authentication → Providers**: Email is on by default and is all LOCK uses.

**Authentication → URL Configuration**:

- **Site URL** — `http://localhost:3000` locally, your real origin in production.
- **Redirect URLs** — add both, exactly:
  - `http://localhost:3000/auth/callback`
  - `https://<your-domain>/auth/callback`

That path is not optional. `@supabase/ssr` uses PKCE, so the link in a
confirmation email carries a code that must be exchanged for a session on the
server. Without the redirect allowed, the link fails and the account is
confirmed but unusable.

Restart `npm run dev` after editing `.env.local` — `NEXT_PUBLIC_` values are
inlined at build time and a running server will not pick them up.

---

## 3. Create the accounts

Go to `/signup` and create the accounts you need. Every one starts as a
`learner` — that is enforced in the database, not in the form.

If email confirmation is on (it is, by default), check the inbox and click the
link before signing in.

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
2. Sign in → back to `/dashboard`, not to the entry page
3. `/admin` as a learner → "This section is not for your account"
4. `/admin` as an admin → the section placeholder
5. The mentor and admin links are absent from the sidebar for a learner

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
