# Blink

**Know what people think before they follow.**

Blink reads an Instagram profile screenshot the way a stranger does — in
seconds — and reports the first impression it creates: eight dimensions, what is
lowering each one, and the single edit that would move it.

Blink is an independent product. It is not affiliated with, endorsed by, or
created by Instagram.

---

## Running it

```bash
npm install
cp .env.example .env.local   # optional; see Configuration
npm run dev                  # http://localhost:3000
```

```bash
npm run build
npm run lint
npm run typecheck
```

Node 20+.

### Configuration

Every capability degrades honestly. Nothing is simulated in place of a missing
credential, and the interface never offers a button that cannot work.

| Missing | What happens |
| --- | --- |
| `ANTHROPIC_API_KEY` | Uploads are refused with an explanation; the sample report is offered instead. |
| Firebase config | Accounts are not offered at all; reports are kept in the browser. |
| Instagram credentials | The integration reports `unavailable`; nothing pretends to be connected. |

`GET /api/config` reports which of these a deployment has, and the interface
reads it once on load so it can describe itself accurately.

---

## The shape of it

The page is not the product. Every "Analyze my profile" button opens the same
flow as an overlay. **Nothing scrolls to a section.**

```
CapabilityProvider       what this deployment can actually do
 └── AuthProvider        Firebase session, or an honest absence of one
      └── AnalyzeProvider   upload → running → report → history → sign-in
           └── Sheet        bottom sheet on phones, centred panel above
                ├── UploadPanel     drag, tap or paste a screenshot
                ├── StagePanel      the screenshot, and one card at a time
                ├── ReportPanel     the score, then the deck
                ├── HistoryPanel    everything you have run
                └── SignInPanel     Google, once, for keeping reports
```

```
src/
  analyze/            the flow: context, sheet, panels, screenshot stage
  auth/               session state and the sign-in surface
  app/
    api/analyze       one screenshot in, one report out
    api/config        what this deployment can do
  components/
    brand/            the mark, drawn
    profile/          the profile under analysis — abstract, and literal
    report/           the score reveal and the report's cards
    scene/            the three looping films
    sections/         the page
    site/             bar, footer, account menu
    ui/               the deck, the card, the button, the dial
  hooks/
    useSceneClock         the choreography engine
    useAnalysisClock      pacing a wait of unknown length
    useReducedMotionSafe  hydration-safe motion preference
  lib/
    ai/                   schema, observation, narration, client
    analysis/             scoring, composition, pipeline, sample, images
    data/                 where reports live, and the shape they live in
    firebase/             config and lazily loaded SDK
    instagram/            the integration, typed and switched off
    server/               env, logging, errors, validation, rate limit, auth
  types/report.ts     the report contract
```

---

## How a report is made

The interesting decision is that **the model never assigns a score.**

```
screenshot ──► observe()   structured observation: enums, counts, evidence
                  │
                  ▼
              score()      eight numbers, computed in TypeScript
                  │
                  ▼
              narrate()    prose, written from the observation and the scores
                  │
                  ▼
              compose()    the report
```

**Stage one** (`lib/ai/observe.ts`) fills in a form. Is a face clearly visible?
How many lines does the bio run to? Does the grid look edited by one hand? Every
field is an enum, a count, a boolean, or a short literal description of
something on screen. It is told repeatedly that it is not rating anything.

**Scoring** (`lib/analysis/score.ts`) turns those answers into the eight
dimensions with fixed, readable arithmetic. The weights are stated in one table
so they can be argued with. This is what makes the product consistent: a model
asked for "trust out of 100" drifts ten points between runs on the same image; a
model asked whether a face is visible does not.

**Stage two** (`lib/ai/narrate.ts`) never sees the image. It receives the
observation and the scores and explains numbers it cannot change, so it can
neither talk itself into a different score nor cite a detail stage one did not
record.

The report's id is a hash of the observation, so re-running the same screenshot
updates the stored report rather than duplicating it.

### Privacy, stated accurately

The screenshot is resized on the device, sent for analysis, and discarded once
the report is written. Blink stores the report, never the image. Signed in, your
reports go to Firestore under your own uid; signed out, they stay in the
browser.

---

## The deck

One interaction carries the whole product. `components/ui/CardDeck.tsx` shows
exactly one card, the next as a sliver behind it, and moves between them
horizontally on one spring — a physical deck, dragged with a thumb. The stages
of an analysis are a deck. The sections of a report are a deck.

There is one exception, and it is deliberate: the score. After a wait spent
watching a deck advance, the deck gets out of the way and the number lands
full-bleed. A moment that arrives inside the same frame as everything else is
not a moment.

---

## Design system

**Colour comes from the logo.** The mark is a gradient squircle holding an
opaque white arch and a translucent lens; where they overlap, neither wins and
the gradient shows through. Its corners give the accent (`#0040F8` deep,
`#10B2FD` azure, `#0B5CFB` the middle the interface lives at), its intersection
gives `--color-overlap`, and its squircle gives the radius scale. The greys are
pulled toward that blue so nothing looks like a default, and elevation is a blue
shadow because the mark is luminous rather than heavy. Score bars are all one
gradient on purpose: a green-amber-red scale would turn a report into a
dashboard.

**Type.** Instrument Sans carries every headline and every score; Geist carries
the interface. Both are vendored locally.

**Motion.** Nothing overshoots, objects have weight, timing is layered in 60–90ms
increments. The films are built on one rule — nothing appears and nothing
disappears. The plate becomes the report; each fragment becomes its own score;
the scores travel into the report rather than fading where they stand. The
fragments are abstract shapes rather than sentences, because a real sentence
inside an animation stops the choreography while it is read.

---

## Accessibility

- `prefers-reduced-motion` honoured globally and per scene; the analysis skips
  its choreography entirely and shows the report as soon as it exists.
- Every film carries a text description of what it shows.
- The flow is a labelled dialog: focus moves in, Escape closes, the page behind
  is scroll-locked.
- The deck is a listbox — arrow keys move it, and position is announced.
- Visible focus rings on the accent colour throughout.
