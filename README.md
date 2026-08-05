# Blink

**Know what people think before they follow.**

Blink reads an Instagram profile screenshot the way a stranger does — in
seconds — and reports the first impression it creates: trust, authority,
visual quality, personality, memorability, and the one line that is doing the
damage.

This repository contains the landing page and the working MVP.

---

## Running it

```bash
npm install
npm run dev      # http://localhost:3000
```

```bash
npm run build    # production build
npm run lint     # eslint (flat config)
npm run typecheck
```

Node 20+. No environment variables are required.

---

## What is real and what is not

The interface, the flow, the report and the motion are all real. The analysis
is not — it is a mock engine that returns one of three fully written reports,
seeded from the file you choose so the same screenshot always scores the same
and two different screenshots never score alike.

Nothing is uploaded. The screenshot is held in an object URL on the device and
never sent anywhere.

### Connecting a real model

Everything the interface knows about analysis lives behind one function in
`src/lib/analysis.ts`:

```ts
analyzeProfile(input: AnalysisInput): Promise<PerceptionReport>
```

To swap the mock for a real vision model:

1. Add a route that accepts the screenshot and returns a `PerceptionReport`
   (the contract is in `src/types/report.ts`).
2. Set `NEXT_PUBLIC_ANALYSIS_MODE=remote`.

`remoteEngine` in the same file is a working reference implementation pointing
at `POST /api/analyze`. No component reaches past this boundary, so nothing in
the UI changes.

The five-second wait in the mock is deliberate — the loading sequence is part
of the product, not a gap in it. Keep a floor on it even when a real model
answers faster.

---

## Structure

```
src/
  app/                      layout, page, tokens, favicon
  components/
    cinematics/             the three scroll-driven films
    mock/                   the fabricated Instagram profile, in parts
    analyze/                dropzone, upload illustration, loading sequence
    report/                 the report and its sections
    site/                   nav, footer
    sections/               the eight page sections
    stage/                  fixed coordinate space that scales to fit
    ui/                     button, score ring, count-up, reveal, icons
  hooks/
    useCinematicClock.ts    the choreography engine
    useReducedMotionSafe.ts hydration-safe motion preference
  lib/
    motion.ts               easing, duration and variant vocabulary
    analysis.ts             the analysis boundary
    mock/                   reports and testimonials
  types/report.ts           the report contract
```

### The motion system

Three rules, applied everywhere (`src/lib/motion.ts`):

1. Nothing bounces — no spring overshoot, no elastic easing.
2. Objects have weight; they start and settle slowly.
3. Timing is layered: related elements move together, offset by small
   consistent increments, never all at once.

Each cinematic is a list of named beats with durations, handed to
`useCinematicClock`. The components describe what each beat *looks like*; the
clock decides *when*. Scenes pause when scrolled out of view and rest on their
final beat when the visitor prefers reduced motion — so the story is still
told, just without travel.

### The design system

One accent colour (clay, `--color-accent`) for the entire product. Everything
else is warm paper, warm ink, and hairlines. Typography and whitespace carry
the design; colour is punctuation. Instrument Serif appears in italic on
exactly four words across the whole site — both fonts are vendored locally, so
there are no third-party requests.

### Accessibility

- `prefers-reduced-motion` respected globally via `MotionConfig` and per-scene
  resting beats.
- Every cinematic carries a text description of what it shows.
- Score rings expose their values to screen readers; the loading sequence is a
  live region.
- Visible focus rings on the accent colour, and a skip link to the demo.
