# Blink

**Know what people think before they follow.**

Blink reads an Instagram profile screenshot the way a stranger does — in
seconds — and reports the first impression it creates: eight dimensions, what is
lowering each one, and the single edit that would move it.

This repository contains the product: a landing page whose only job is to open
the flow, and the flow itself.

Blink is an independent product. It is not affiliated with, endorsed by, or
created by Instagram.

---

## Running it

```bash
npm install
npm run dev      # http://localhost:3000
```

```bash
npm run build
npm run lint
npm run typecheck
```

Node 20+. No environment variables required.

---

## The shape of it

The page is not the product. Every "Analyze my profile" button — in the bar, the
hero, after each story, beside the report preview, before the reactions, and at
the end — opens the same flow as an overlay. **Nothing scrolls to a section.**

```
AnalyzeProvider          state machine: upload → running → report
  └── Sheet              bottom sheet on phones, centred panel above
        ├── UploadPanel  drag, tap or paste a screenshot
        ├── PipelinePanel 13 stages, 8 lines of copy, ~5s
        └── ReportPanel  progressive reveal, own scroll container
```

```
src/
  analyze/            the flow: context, sheet, three panels
  app/                layout, page, tokens
  components/
    brand/            the mark and wordmark
    profile/          the profile under analysis, in separable parts
    report/           score hero, metric list, insight blocks
    scene/            the three looping films
    sections/         the seven page sections
    site/             bar, footer
    ui/               button, dial, count-up, marquee, accordion, avatar
  hooks/
    useSceneClock         the choreography engine
    useReducedMotionSafe  hydration-safe motion preference
  lib/
    motion.ts             easing, duration and variant vocabulary
    analysis/engine.ts    the analysis boundary
    analysis/pipeline.ts  stages, weights and copy
    mock/                 reports, reactions, questions
  types/report.ts     the report contract
```

---

## What is real and what is not

The interface, the flow, the motion and the report structure are real. The
analysis is not: a mock engine returns one of three fully written reports, seeded
from your file so the same screenshot always scores the same and two different
screenshots never score alike.

Nothing is uploaded. The screenshot lives in an object URL on the device and is
released when the flow closes.

### Connecting a real model

Everything the interface knows about analysis is one function in
`src/lib/analysis/engine.ts`:

```ts
analyzeProfile(input: AnalysisInput): Promise<PerceptionReport>
```

1. Add a route that accepts the screenshot and returns a `PerceptionReport`
   (the contract is in `src/types/report.ts`).
2. Set `NEXT_PUBLIC_ANALYSIS_MODE=remote`.

`remoteEngine` in the same file is a working reference implementation pointing at
`POST /api/analyze`. No component reaches past this boundary.

Keep a floor on the duration even with a fast model — the pipeline is part of the
product, not a gap in it.

---

## Design system

**Colour.** White ground, cool neutral greys with a faint blue bias, near-black
ink, and exactly one accent (`--color-accent`, cobalt). Score dials and bars are
all one colour on purpose: a green-amber-red scale would turn a report into a
dashboard. Red survives in two places only, where it is functional — a like
heart and an error message.

**Type.** Instrument Sans carries every headline and every score; Geist carries
the interface. Both are vendored locally, so there are no third-party requests
and no flash of fallback type.

**Motion.** Three rules in `lib/motion.ts`: nothing overshoots, objects have
weight, timing is layered in 60–90ms increments. Each scene is a list of named
beats handed to `useSceneClock`, which pauses when scrolled out of view and rests
on its final beat under `prefers-reduced-motion`.

**The profile mock** is built from vectors, not images, and deliberately is not a
reproduction of any app's interface — it is the grammar every social profile
shares (face, handle, counts, bio, collections, grid), assembled from separable
parts so the hero film can pull it apart.

---

## Accessibility

- `prefers-reduced-motion` honoured globally via `MotionConfig` and per scene.
- Every film carries a text description of what it shows.
- The flow is a labelled dialog: focus moves into the sheet, Escape closes it,
  and the page behind is scroll-locked while it is open.
- Score dials expose their values to screen readers.
- Visible focus rings on the accent colour throughout.
