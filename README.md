# ShowMe

One page for everything you make — `showme.at/<username>`.

**Phase 7: growth.** A creator builds a page out of blocks, decides how it
looks, finds out whether any of it worked — and then gets it in front of people.
Share it in two taps or a system share sheet, put a QR code on a business card,
schedule a drop for Friday and let it appear on its own, feature the link that
matters, and have the page carry a real title, a generated social card and a
sitemap entry so somebody can find it without being handed the address.

---

## Running it

```bash
npm install
cp .env.example .env.local     # then fill in your Supabase keys
npm run dev                    # http://localhost:3000
```

```bash
npm run typecheck
npm run lint
npm test                       # validation unit tests
npm run test:db                # schema + RLS, against a real Postgres
npm run build
npm run check                  # all of the above
```

Node 20+. Without Supabase keys the app still runs: public routes render, and
anything needing a session says so instead of crashing.

---

## Structure

```
src/
  app/
    page.tsx              landing placeholder
    globals.css           the app's own tokens
    page-design.css       the creator page's design system
    login/  signup/       functional auth
    onboarding/           for an account that arrived without a username
    api/username/         availability, while somebody is typing
    api/track/view/       the page-view beacon's endpoint
    sitemap.ts            creator pages, in chunks of five thousand
    sitemap-index.xml/    the index that names those chunks
    go/[linkId]/          the click redirect — every link button goes through it
    (app)/                the signed-in shell — protection lives in its layout
      dashboard/  editor/
      dashboard/analytics/  what the page did
    [username]/           the public creator page, and its 404
      opengraph-image.tsx the 1200×630 card a shared link previews as
    robots.ts             what a crawler may visit
    error.tsx  global-error.tsx  not-found.tsx
  components/
    ui/                   button, field
    layout/               site header, app nav
    auth/                 the auth form, sign out
    public/               everything the creator page renders
      blocks/             one component per block type
    editor/               the editor, its forms and its controls
    analytics/            the dashboard's stats, bars, chart and range picker
    share/                the share sheet, and the QR panel behind it
  lib/
    design/               themes, tokens, the design schema, contrast
    supabase/             server client, browser client, session refresh,
                          a session-less client for the public page, and the
                          admin client that writes events
    auth/                 the data access layer, server actions, route rules
    validation/           usernames, URLs, reserved names, schemas
    usernames/            is this name free?
    blocks/               the block registry and one schema per type
    editor/               the draft, the save payload, the editor's actions
    embeds/               which URLs may become an iframe
    media/                what counts as an image, and where it may live
    public-page/          the query, the shape, the avatar
    analytics/            sources, devices, bots, the visitor hash, recording,
                          the ranges, and the dashboard's queries
    links/                when a link is on the page, and when it is not
    contact/              email, phone, WhatsApp and an address, as actions
    share/                where a creator can send their page, and how
    seo/                  titles, descriptions, structured data, the sitemap
    qr/                   a QR encoder, written rather than installed
    env.ts                configuration, and whether there is any
  types/database.ts       the schema, in TypeScript
  proxy.ts                runs before every route
supabase/
  migrations/             the schema and its policies
  tests/                  a Postgres shim, six RLS suites, a runner
```

---

## How authentication works

Three layers, and only one of them is the security boundary.

**`src/proxy.ts`** runs before every rendered route. Its real job is refreshing
the Supabase session: access tokens are short-lived, Server Components cannot
write cookies, so without this a rotated token would be discarded on every
render and people would be logged out at random. It also redirects a signed-out
visitor away from `/dashboard` and `/editor` — but that is a convenience, so the
browser never paints a shell it is about to lose.

> Next.js 16 renamed `middleware.ts` to `proxy.ts`. The behaviour is unchanged.

**`src/lib/auth/dal.ts`** is the boundary that counts. Every function that
depends on who is asking verifies the session itself, with `getUser()` rather
than `getSession()` — the latter decodes the cookie and believes it, which is
fine for rendering a name and unacceptable for deciding what somebody may read.
It is wrapped in React's `cache()`, so a layout, a page and three components
asking the same question cost one round trip.

**Row Level Security** is the layer that holds when the other two are bypassed
entirely. A Server Action is reachable by direct POST; `supabase-js` is
reachable from a browser console. Neither can read or write a row the policies
do not allow. See [`supabase/README.md`](supabase/README.md).

Nothing that crosses into the server trusts a `profile_id` from the request.
Ownership always comes from the session.

---

## Usernames

A username is the whole address, so the rules are strict and they live in two
places: `src/lib/validation/username.ts` for the browser, and SQL for the
database. The database is the one that decides;
`supabase/tests/02_usernames.sql` asserts the two agree.

Lowercase letters, digits, underscore and hyphen. Three to thirty characters.
Alphanumeric at both ends, and never two separators in a row.

**Normalizing folds, it does not strip.** `Alex` becomes `alex`, but `john doe`
stays `john doe` and is then refused. Quietly deleting the space would hand
somebody `johndoe` — an address they never typed and never checked.

**The name is claimed in the same transaction as the account.** `signUp` passes
it as user metadata; a trigger on `auth.users` reads it back out and creates the
profile. There is no second request that could fail on its own, and no window
where an account exists without a page. If the name was taken in the
milliseconds since the availability check, the unique index rejects it, the
whole signup rolls back, and no orphaned account is left behind.

**The availability check is a courtesy, not a guarantee.** It exists to tell
somebody early. Between the check and the write, anybody can take the name, so
both the signup action and the claim action are written to expect the answer to
arrive late — from `profiles_username_key`, which is the only thing that
actually decides.

**Usernames are write-once for now.** Changing one changes a public URL, which
breaks old links, splits analytics and rots search results. None of that is
handled yet, so a trigger refuses the change rather than leaving the door open
for a client to walk through `supabase-js` directly. `username_claimed_at` is
maintained by that trigger, because a client that could write it could reset
itself to unclaimed and rename freely.

**An account without a username is a real state.** Created from the Supabase
dashboard, or by a signup that predates this flow. It gets a placeholder derived
from its id, `username_claimed_at` stays null, and the app shell sends it to
`/onboarding`. The normal signup never lands there.

---

## The public page

`showme.at/<username>` is the route the product exists to serve. It is opened
from a bio link, on a phone, on mobile data, by somebody who will give it about
a second. Everything about it is arranged around that.

**One function reads it.** `getPublicPage(username)` in
`src/lib/public-page/query.ts` returns the profile, the links, the socials and
the blocks in a single embedded select — not four queries fanned out across the
component tree. It is wrapped in React's `cache()`, so `generateMetadata` and
the page body share one round trip instead of making two. Columns are named
rather than `select("*")`, which keeps `profile_id` and the owner's uuid out of
the server-rendered payload.

**The query has no session.** `createPublicClient()` builds a Supabase client
with `persistSession: false` and no cookies, so Row Level Security evaluates
every row as `anon`. Two things follow. The response depends only on the URL, so
it can be cached. And a signed-in creator opening their own address sees exactly
what the world sees — with a session-bearing client they would see their own
drafts on their public page, which is the one place they must not appear.

**Shaping is separate from fetching.** `src/lib/public-page/shape.ts` is a pure
`toPublicPage(row)`: ordering, what gets dropped, what a null column means. It
is unit-tested without a database, and the editor's live preview shapes its
draft through the same function — which is what stops the preview and the
published page from disagreeing. It filters unpublished rows itself rather than
trusting its caller, because the preview hands it unfiltered state.

**Ordering is deterministic.** `position ASC`, then `created_at`, then `id`.
`position` is not unique — mid-reorder two rows share one — and without the last
two steps the same page can come back in a different order on two requests.

**Nothing renders arbitrary HTML.** Block `data` is untrusted JSON. It goes
through a zod schema in `src/lib/blocks/`, and a block whose type is unknown or
whose data fails its schema is dropped rather than rendered as a fallback.
There is no `dangerouslySetInnerHTML` anywhere in `src/components/public/`, and
the text block offers two styles rather than rich text for exactly that reason:
a creator who could write markup would be writing it into somebody else's
browser.

**Only three sites can become an iframe.** A `src` taken from user input is
arbitrary code execution on a showme.at address, so a pasted URL is never
rendered — it is matched against a known host, reduced to an id that passed a
narrow character class, and substituted into a template in
`src/lib/embeds/providers.ts`. An unsupported link is refused in the editor,
in front of the person who pasted it. `sandbox` is the second layer, and it
withholds `allow-top-navigation`.

**URLs are checked twice more than they need to be.** The database has a CHECK
constraint on the scheme and every write goes through `urlSchema`, so a
`javascript:` href should be impossible — `toPublicPage` drops one anyway,
because "impossible" is a claim about today's code and this one renders an
`href`. Avatars are narrower still: `renderableAvatarUrl()` accepts only an
`https` URL on the Supabase storage host, so a creator cannot point the page's
one `<img>` at an arbitrary server.

**Almost no client JavaScript of its own.** One component under
`src/components/public/` is a Client Component: the gallery's arrows, a few
hundred bytes that appear only when the row actually overflows and only above
`sm`, because a touch device already has the gesture. Everything else is server
rendered. The editor's own dependencies — dnd-kit, every form — are in chunks
the public route never references; `npm run build` and a look at the emitted
chunks is how that stays true.

---

## The editor

`/editor` is where a page gets built. It is a Client Component holding one
object — the draft — and a single action that persists it.

**Blocks are the spine.** A page is an ordered array of blocks, and the array
*is* the order: `save_page` writes each block's index as its `position`, so
reordering is moving an item and saving. Two block types own rows in their own
tables rather than JSON — a links block owns `links` by `block_id`, and the
socials block reads `social_links` — because those are first-class rows that
`link_clicks` references by id. Everything else lives in the
block's own `data`.

**One registry, two lookups.** `src/lib/blocks/registry.ts` holds what is true
about a block type regardless of who is asking: its name, its description, its
schema, its defaults, whether a page may hold more than one. It contains no
React, because the public renderer imports it and a component there would put
every editor form inside the public page's import graph. The renderer and the
editor each map types to components in a thin lookup, and both key off
`BlockType` — so a type added to one and forgotten in the other is a compile
error rather than a blank space on somebody's page.

Adding a block type is: a value in the database enum, a schema, an entry in the
registry, a renderer, an editor form. Nothing else changes.

**Editing is local; saving is one request.** Every keystroke changes the draft
in memory, which is what makes the preview instant. Nothing is written until
Save. The alternative — a write per interaction — makes "Saved" meaningless,
turns a reorder into eight requests, and leaves no moment at which the page is
a thing the creator has finished composing.

**Saving is one transaction, in the database.** `save_page(payload jsonb)` is a
`security invoker` function that replaces the whole page: upsert the blocks,
delete what is missing, then the links, then the socials. Nine statements from
the application would let a dropped connection leave a page nobody composed —
blocks reordered, links not yet written, a section rendering as empty. Being
`security invoker` matters as much: Row Level Security applies to every
statement inside it, so the function is a transaction boundary and not a
privilege boundary. It takes no owner. The owner is `auth.uid()`, so there is
no argument a client could set to write somebody else's page.

**Ids are generated in the browser.** A new block gets a `crypto.randomUUID()`
before it exists anywhere, so it can be dragged, previewed and given links
without a round trip, and the save is an upsert rather than an insert followed
by a relabel. That is safe for the same reason the rest of the payload is: a
client that invents an id gets a row of its own, and one that sends a stranger's
id gets a refusal from RLS — asserted in `supabase/tests/04_editor.sql`.

**Uploads happen immediately; everything else waits for Save.** A `File` cannot
survive a reload in React state, and a creator who picked four gallery images
should not lose them to a stray refresh, so the bytes go up as the file is
chosen and the URL travels in the draft like any other string. The cost is that
abandoning an edit can leave an unreferenced object in the bucket. That is the
right way round — an orphaned image is invisible and cheap, where a lost upload
is somebody doing the work twice.

**Dragging and arrows are both real.** dnd-kit moves blocks with a pointer or
the keyboard; every card also has Move up and Move down, and every nested list
— links, socials, gallery images — has only those. A button that says what it
does needs no discovery, works with a thumb on a narrow screen where a drag
competes with the page's own scroll, and is the thing a screen reader can
actually use.

**Unsaved work is defended twice.** `beforeunload` catches a reload or a closed
tab. It does not catch a client-side navigation, which is how somebody actually
leaves — by pressing "Dashboard" in the nav — so a capture-phase click listener
confirms before any same-origin link takes them off the page.

---

## The design system

Content says what is on a page. Design says what it looks like. They meet in
one component and nowhere else.

**One column, not a table.** `profiles.design` is JSONB holding the
*difference* between the creator's chosen theme and what they changed — a page
on Noir with nothing else touched stores `{"theme":"noir"}`. That sparseness is
the point: every decision they did not make keeps arriving from the theme, so
refining a theme improves the pages that chose it instead of requiring a data
migration. It needs no new policy, because `profiles` is already world-readable
and owner-writable, which is exactly right for how a page looks.

**Two steps, both pure.** `resolveDesign()` lays the overrides over the theme
and answers every question the renderer can ask. `designStyle()` and
`designAttributes()` turn that into CSS custom properties and `data-sm-*`
attributes. The public route and the editor's preview run the identical
functions on identical input, which is why the preview cannot drift.

**Nothing a creator types becomes CSS.** This is the security property of the
whole phase. A colour is six hex digits matched against a pattern; everything
else is a member of a literal tuple. The one value that is neither — a
background image URL — must already be on our own Storage host, and is then
wrapped in `url("…")` with its quotes and parentheses escaped, so it cannot end
the function early and start a declaration. The tokens go into a `style` prop,
where React sets them as properties rather than concatenating a string.
`src/lib/design/__tests__/design.test.ts` is mostly attempts to get something
else through.

**A theme is a whole design, not a palette.** Each of the seven answers
palette, background, typeface, scale, button style and shape, block surface,
social treatment, width, spacing, header and avatar. Two themes differing by a
shade of grey would be one theme and a bug report; a test asserts no two are
the same design under different names, and another asserts every theme's own
colours pass WCAG AA.

**Switching theme clears the sub-choices and keeps the colours.** Carrying
Bold's pill buttons and tight spacing into Paper produces neither theme. A
custom accent is different — somebody picked it for a reason and would not
expect a theme to take it back — so it survives, and Reset is there for when it
should not. Neither ever touches a link, a block, an image or a username;
`supabase/tests/04_editor.sql` asserts it.

**Contrast is a warning, not a rule.** A creator may know exactly what they are
doing with a faint caption over a photograph. What they should not do is find
out from a stranger who could not read the page, so `paletteWarnings()`
computes the real WCAG ratio and says so beside the control that caused it —
holding body text to 4.5:1 and muted text to 3:1, because muted text is meant
to recede and failing it at 4.5 would fire on almost every good design and
teach people to ignore the panel.

**Four typefaces, one download.** `next/font/google` fetches them at build time
and serves them from our own origin, so a visitor never makes a request to
Google. All four `@font-face` rules ship — about a kilobyte — and `preload:
false` means the browser fetches a family only when something is set in it. A
page on the default theme downloads one font file; a page on any other
downloads two, the second being Geist for the `@handle` line, which is the
app's own typeface and already cached.

**The editor's design panel never reaches a public page.** It is a Client
Component behind the same tab as the block editor, and the build's emitted
chunks are checked: no dnd-kit, no design panel, no editor UI in anything
`/[username]` references. The whole design system costs the public page 8KB of
gzipped CSS and no JavaScript at all.

---

## Analytics

A creator should be able to answer two questions: is anybody looking, and does
anything on the page get pressed. Everything here exists for those two, and
stops there.

**Two events, and one of them is a redirect.** A view is recorded by a small
beacon on the public page; a click is recorded by `/go/<link-id>`, which is
where every link button points. The click could not be a beacon: a browser
following an outbound `href` is entitled to tear down the page before a
`fetch` leaves, so a client-fired click event is a request you lose exactly
when somebody engages with the page. A server redirect happens on the request
that is already going somewhere.

**The redirect never trusts the URL it is given.** It receives a link id,
looks the row up under Row Level Security — which is also what makes a hidden
link 404 rather than redirect — and sends the visitor to the URL stored on
that row, after the same protocol check every other URL in the product goes
through. `?url=` is ignored, because there is no code path that reads it. A
`302`, not a `301`: a permanent redirect is cached by the browser, and a
cached click is a click that is never counted and a destination the creator
can never change.

**The view is a beacon precisely because the page is cached.**
`/<username>` is ISR-cached for sixty seconds, so counting a view during render
would count one visitor per revalidation and miss everybody else. The beacon
also reads the real `document.referrer` — the server would see only our own
page on the `/go` request — and it costs nothing for the crawlers that make up
most of the traffic to a new page, because they do not run it.

**Nothing about a visitor is stored.** No cookie is set. No fingerprint is
computed. The raw user agent and the full referrer are not written to the
database at all: what is written is a `device` from four values, a `source`
from a fixed list of about twenty, and at most a bare hostname. The IP address
is read once, in `src/lib/analytics/visitor.ts`, to compute an HMAC keyed by a
secret and today's date, and never leaves that function. Because the key
rotates daily, two days of rows cannot be joined together into one person's
history — which is what makes "visitors" an estimate rather than a
surveillance record, and the dashboard calls it an estimate.

Without `ANALYTICS_SALT` the hash is not computed and the Visitors figure reads
*Not available here*. A per-instance random salt would produce a number, and
the number would be wrong in a way nobody could see.

**Ingestion cannot be forged.** `page_views` and `link_clicks` have no insert
policy for anyone, so the anon key cannot write an event from a console. Both
tracking paths resolve the owner server-side — from a username, or from the
link row — and insert with the service-role client. No `profile_id` from a
request is ever written.

**Reading is decided by the database.** The dashboard calls five
`security invoker` functions, and not one of them takes a profile id. There is
no argument to tamper with and no `where` clause to forget: the rows a caller
gets are the rows their own policies allow. `authenticated` may execute them;
`public` may not.

**A failed insert is nothing.** Both `recordPageView` and `recordLinkClick`
swallow every error, and both run inside `after()` — so the response has
already been sent and the redirect has already happened when the write is
attempted. A missing service key, an unreachable database or a constraint
nobody anticipated costs a statistic and never a page. With no key configured
at all, nothing is recorded and the whole site behaves normally.

**Bots are excluded at the door.** A self-identifying crawler, preview fetcher
or scripted tool is redirected but not counted, and a request with no user
agent counts as a bot — a real browser always sends one. This is not
anti-abuse; it is the difference between a creator seeing "40 views" and
seeing the eleven people who actually looked. A small in-memory rate limit
sits in front of ingestion for accidents and casual abuse, and says plainly in
its own file that it is per-instance.

**Deleting a link keeps its clicks.** `link_clicks.link_id` is
`on delete set null` with a title snapshot taken at click time, so tidying up
the page does not silently reduce last month's total. The dashboard shows the
row with its old title, marked as deleted.

**No number is invented.** A comparison against the previous period appears
only when there is a previous period that reaches back before the account was
created; otherwise the card says *Not enough data* rather than showing a
percentage against zero. CTR is blank when there are no views. A breakdown with
no rows says so instead of drawing an empty chart. There is no model call
anywhere in this phase and no "insight" that is not a count.

**One known limitation, stated where it matters.** A click's referrer is the
creator's own page, so traffic sources are computed from views. Recovering the
original source of a click would mean carrying it in a cookie, which is the one
thing this phase refuses to do.

---

## Sharing, and the QR code

**Two taps, or one.** The dashboard's Share button opens a sheet with the page's
own preview — avatar, name, address — a Copy link button, the platform list, and
a QR code behind one more tap. Where the browser has a native share sheet the
sheet offers it; where it does not, that button is simply absent, because a
button that opens nothing is worse than one button.

**Instagram and TikTok copy the link, and say where to paste it.** Neither has a
public URL that composes a post containing a link — on Instagram a link goes in
a bio or a story sticker, on TikTok in a bio, and both are done by pasting. X,
WhatsApp, Telegram and email have real intents and get them. Pretending
otherwise is how a share sheet ends up with a button that opens a broken
composer.

**The QR encoder is ours.** Not a dependency: the libraries that do this well
weigh twenty to fifty kilobytes because they encode eight modes across forty
versions, and a page address is a short ASCII URL. `src/lib/qr/encode.ts` is
byte mode, level M, versions 1–10 — 213 bytes of payload where the longest
possible address is 48. It was verified module-for-module against an independent
reference encoder over 546 payloads, which found three bugs that each produced a
symbol that scanned perfectly and disagreed with the standard; the results are
pinned as golden digests in its tests.

**The download is a 999px PNG with the address underneath.** Nothing is drawn
over the symbol. A logo in the middle of a QR code works by spending the error
correction that was there to survive a scratched card, and text over the modules
is worse — so the useful thing goes below the quiet zone, where it also rescues
a scan that fails. The downloaded file decodes back to exactly the encoder's
matrix; that is asserted from the pixels.

**None of it reaches a visitor.** The encoder and the sheet are in chunks only
the dashboard references, and the sheet is fetched when the button is pressed.
The public page's own share affordance is one small button in the footer that
uses `navigator.share` or the clipboard and nothing else.

---

## A link's life

A link can now start, end, be featured, and carry an icon. Only the first is a
security property.

**Scheduling is a policy, not a filter.** `live links are readable by anyone` in
`20260106000001_growth.sql` adds the window to the rule that decides who may
read the row at all. Every reader goes through it — the public page's
session-less query, a browser console with the anon key, and the `/go/<id>`
redirect, which refuses a scheduled or expired link without a line of code being
added to it. A link that has not started is indistinguishable from one that does
not exist.

**Times are absolute instants, and the editor says which zone it is showing them
in.** `starts_at` and `ends_at` are `timestamptz`; the editor reads and writes
them in the device's own zone and prints the zone's name under the fields. There
is exactly one moment at which a link appears, and the server's zone never
enters into it. The one consequence worth stating: a creator who schedules a
drop in Paris and opens the editor in New York sees the same instant written as
a different clock time — the link did not move, the reader did.

**The window is inclusive at the start, exclusive at the end.** The same
convention the analytics ranges use, so two links scheduled back to back are
never both on the page.

**A cached page is up to a minute behind.** `/<username>` is ISR-cached for sixty
seconds, so a scheduled link can appear up to a minute after its start. That is
a property of caching a page rather than of scheduling; the editor says so next
to the field, and the alternative — rendering every creator page dynamically to
serve the minority that have a schedule — would cost every visitor a round trip.

**A status is never something to guess at.** The editor shows Live, Scheduled,
Expired, Hidden and Featured on the row itself, with the window summarised
beside it, so a creator who cannot find a link on their page is told which of
the four reasons applies rather than left to deduce it from two date fields.

**A link keeps its id through all of it.** Featuring, scheduling, expiring and
hiding are columns on the row a click already references, so per-link analytics
survives every status change — and a link deleted afterwards still keeps its
clicks under its snapshotted title, as it has since Phase 6.

**A grid is a layout, not a second kind of link.** "Link grid" is a value in the
links block's own data, so a creator switching a section to a grid renders the
same rows through the same `/go/<id>` and does not restart a single link's
history. A separate block type would have meant a second set of link rows and
clicks attributed to identities nobody created.

**An icon is a platform mark or an upload, never a favicon.** The eighteen glyphs
the socials row already ships cost nothing extra; an uploaded icon lives in the
same bucket under the same ownership rules. Fetching a site's favicon would mean
this server making requests to whatever host a creator typed, which is
server-side request forgery with a friendly name.

---

## Being found

**Every public page carries its own metadata.** A title that is the creator's
name and handle, a description that is their bio or a plain factual sentence
when there is none, one canonical URL, Open Graph, and a Twitter card. Nothing is
generated about a person we know nothing about, and nothing from the analytics
tables appears anywhere in it.

**The social card is generated per creator, in their own palette.**
`opengraph-image.tsx` renders 1200×630 with the avatar, name, handle, bio and
address, using the same resolved design the page wears — so a link to a Noir page
previews dark. The avatar is fetched explicitly with a timeout and a size cap
rather than handed to the renderer, because a failed fetch inside the renderer
throws and a throw here means every shared link loses its preview.

**Structured data says only what is true.** A `ProfilePage` whose `mainEntity` is
a `Person`, carrying name, handle, bio, avatar and `sameAs` — the last being the
whole reason it earns its bytes, since it is how a search engine learns that this
page and an Instagram account are the same person. No ratings, no job title, no
view counts. The serialization escapes `<`, `>` and `&`, which is what stops a
bio containing `</script>` from ending the element; its tests attack it directly.

**The sitemap is chunked and read one page at a time.** `/sitemap-index.xml`
names `/sitemap/<n>.xml`, five thousand creators each, ordered by username so a
signup between two chunks cannot shift a row out of both. `robots.txt` names the
index alone, so the file does not grow with the creator count.

**A creator can leave search.** `profiles.search_visible` defaults to true,
because a page exists to be found. Turned off, the page carries `noindex` and
leaves the sitemap — and still opens normally for anyone holding the address, as
it must, because that address is in their bio. It is a search setting, not a
privacy one, and the editor says so in those words.

---

## The blocks, as of now

Links, socials, text, **heading**, image, gallery, video, music, **contact**,
divider and **spacer**. The five that are new or changed in this phase:

**Heading** is the semantic article the text block's "heading" style only
imitated: a real `<h2>` or `<h3>` in the document outline, which is what a screen
reader navigates by. Two levels and no way to reach `<h1>` — the creator's name
is the page's title.

**Contact** is four actions rather than four links: email, call, WhatsApp and an
address. Each is a different scheme built from a differently validated value —
`mailto:` from an address that passed the same pattern the database constraint
uses, `tel:` from digits, `https://wa.me/<digits>` from a number that had to
carry a country code, because `wa.me` without one reaches somebody else's phone.
An address is text plus a link the creator chose; there is no constructed map
URL, because which map somebody uses is not ours to pick.

**Spacer**, and the divider's new treatments, are the page's own rhythm — scaled
to its spacing setting rather than to a number of pixels.

**Links** gained a grid layout, featured links and per-link icons; **gallery**
gained a grid layout and a destination per image. Gallery image links are not
tracked, and the reason is worth being straight about: a click row references a
link id, and a gallery image is JSON inside a block with no row of its own.
Shadow `links` rows would double every page's link count and put entries in the
dashboard's top links that the creator never made.

**Music** is what the Spotify block became: Spotify, Apple Music and SoundCloud,
one entry each in `lib/embeds/providers.ts`. Video gained TikTok. Twitch is
deliberately absent — its player refuses to load unless a `parent` parameter
matches the serving hostname, which the editor's in-browser preview cannot know,
and an embed that works in production and silently fails in the preview is worse
than a link.

## Decisions worth knowing

**`connection()` in the data access layer, not `export const dynamic`.**
Next.js 16 removed the `dynamic` route segment config. Reading cookies usually
makes a route dynamic on its own, but the unconfigured code path returns before
touching them — which would let a protected page be prerendered at build time
into whatever the build machine saw. `await connection()` in `getUser()` states
the requirement once, where it cannot be forgotten per route.

**No app-wide `loading.tsx`.** A root loading boundary opens a Suspense
boundary on every route, which commits a `200` before `notFound()` or
`redirect()` can set a status. With one, a mistyped creator name returned a soft
404 and `/Alex` returned 200 with a meta refresh. Without one, `/nope` is a real
`404` and `/Alex` is a real `307`. Add Suspense where data is genuinely slow,
not globally.

**Usernames are canonical or they are a redirect.** `/Alex`, `/alex` and
`/a.lex` must not be three pages. `usernameFromPath()` accepts only the already
normalized form; anything else redirects to the canonical address, so links,
analytics and search results never fragment across spellings.

**A `mailto:` is allowed in exactly one column.** `social_links.url` accepts it;
`links.url` does not. It is safe in an href in a way `javascript:` and `data:`
are not — it hands an address to the operating system rather than executing
anything — but a link button that silently opens a mail composer is a surprise,
so only the contact icon widens. The constraint refuses anything after the
address, because `mailto:` takes headers through `?cc=` and a newline in one is
the classic injection.

**Uploaded images live in a public bucket, and the write side is what is
locked.** These are the content of a public page: fetched by strangers, cached
by a CDN, embedded in HTML that Next.js caches for a minute. Signed URLs would
expire inside that window and leave a cached page pointing at dead images. So
reads are public, writes are `(storage.foldername(name))[1] = auth.uid()`, and
nothing private is ever put there — the path carries no email, no token, and
not the filename the uploader chose.

**A file's type is decided by its leading bytes.** `File.type` in a multipart
body is a string the client picked; a script named `photo.png` arrives claiming
`image/png` if the uploader says so. `sniffImageMime` reads the signature, and
that is what chooses the stored extension. SVG is absent from the list on
purpose: it is a document that can carry script.

**Grid items need `min-w-0`.** A grid item's automatic minimum size is its
min-content width, so the editor column refused to shrink below its widest
block summary — and a phone browser answers that by widening the layout
viewport rather than showing a scrollbar, which silently zooms the whole page
out. It looks like a font bug and is a layout one. The responsive check now
fails on a widened layout viewport, not only on `scrollWidth`.

**Satori is not a browser, and it throws.** The Open Graph card is rendered by
`next/og`, which lays out a subset of CSS and refuses the rest at request time
rather than approximating it. Two rules bite: every element with more than one
child must declare `display` — and `@{username}` in JSX is *two* children, a
string and an expression, which cost a 500 on a metadata route to discover — and
there is no `text-overflow`, so long text is clamped with `maxHeight` and
`overflow: hidden`. Both are noted in the file itself.

**The share sheet is a `<dialog>` opened with `showModal()`.** The platform
already implements the focus trap, the inert background, the Escape key and the
backdrop, and every hand-rolled modal gets one of the four wrong. What is left
to write is the label association and closing on a backdrop click. Verified in a
browser: focus enters the dialog, no control outside it is reachable while it is
open, every control shows a focus ring, and focus returns to the button that
opened it.

**No `robots` directive in the root layout.** An absent one already means index
and follow, so declaring it bought nothing — and on a 404 it was actively wrong.
Next.js emits its own `noindex` for a not-found render and then appends the
layout's metadata after it, so `/nope` went out with two contradictory `robots`
tags. Routes that must not be indexed declare it themselves; `robots.txt` covers
the crawl rules.

**The reserved list is duplicated on purpose.** `src/lib/validation/reserved.ts`
gives instant feedback while someone types; `reserved_usernames` is what
actually holds the line, and it is a table so names can be added without a
deploy.

**Analytics has no insert policy.** Not an oversight — an anonymous insert
policy would let anyone forge a creator's traffic. Ingestion is server-side with
the service-role key, and the dashboard reads through `security invoker`
functions that take no owner argument.

**The public page is cached for sixty seconds, and the route is prerenderable.**
`export const revalidate = 60` alone did nothing: Next.js treats a dynamic
segment as fully dynamic and re-renders it on every request, and the route went
out with `private, no-cache, no-store`. Adding `generateStaticParams()` returning
an empty list is what makes the segment prerenderable — "build nothing now,
cache what you render" — after which it serves
`s-maxage=60, stale-while-revalidate` and `x-nextjs-cache: HIT`. Sixty seconds
is only the ceiling; `revalidatePublicPage()` drops an entry immediately, and
Phase 4 calls it after every edit.

**The proxy skips the public page.** Refreshing a Supabase session on a route
that never reads one costs a round trip on the request that most needs to be
fast. `needsSession()` limits the proxy's work to the landing page and the
signed-in routes; `/<username>` returns before any Supabase client is built.

**Cache Components is off.** Next.js 16 ships it opt-in, and it changes caching
semantics across the whole app — including removing `revalidate`, which the
public page depends on. Turning it on is a migration, not a flag, and it belongs
to the phase that has a reason to want it.

**Nothing sets cache headers to defeat the Back button.** It was tried. A
`cache-control` set in the proxy is replaced by the one Next.js writes when it
renders, so the header never reached the browser — protection that looked real
and was not. It is also unnecessary: every dynamically rendered response leaves
production with `private, no-cache, no-store, max-age=0, must-revalidate`, and
`no-store` is exactly what keeps a page out of the back-forward cache.

**A database failure on a public page is a 500, not a 404.** The two are
indistinguishable to the code that fetches a profile and very distinguishable to
a search engine: a page that 404s while the database is down gets de-indexed,
where a 500 is retried. `getPublicPage` returns null only for a name nobody has
claimed, and throws `PublicPageError` otherwise.

**Profiles are readable by anyone, including anonymously.** The public page has
to render for a logged-out visitor, and the table holds only what a creator
chose to publish. The cost is that the full list of usernames is enumerable
through the anon key — as it already is by visiting URLs. Nothing private lives
there; email is in `auth.users`, which is not exposed.

---

## Environment

| Variable | Required | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Safe in the browser; RLS is what grants access. |
| `NEXT_PUBLIC_SITE_URL` | no | Canonical origin. Falls back to `VERCEL_URL`, then localhost. |
| `SUPABASE_SERVICE_ROLE_KEY` | no | Records analytics events. Unset, nothing is recorded and everything else works. |
| `ANALYTICS_SALT` | no | Keys the daily-rotating visitor hash. Unset, the Visitors figure reads *Not available here*. |

The service-role key bypasses Row Level Security. It is used in exactly one
file — `src/lib/supabase/admin.ts` — only ever to insert events, and must never
be exposed to the browser or prefixed with `NEXT_PUBLIC_`.

Country is read from whatever header the host sets (`x-vercel-ip-country`,
`cf-ipcountry`, `x-country-code`, `fly-client-country`). There is no variable
and no bundled geolocation database; where no header arrives the dashboard says
the data is unavailable.

---

## What is not here yet

Monetization, Stripe, commerce, bookings, forms, email marketing, social
publishing, and anything that would call a model to tell a creator what to do.
All later phases. The schema and the policies for them are already in place,
which is the point.
