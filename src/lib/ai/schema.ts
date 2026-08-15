import { z } from "zod";

/**
 * What the model is allowed to tell us.
 *
 * Blink's analysis is deliberately split in two so that the same screenshot
 * always produces the same report. Stage one is *observation only*: the model
 * looks at the image and fills in this schema — mostly enums and counts, with
 * short evidence strings. It never assigns a score. Stage two turns those
 * observations into prose.
 *
 * Scores are computed from the observation in `lib/analysis/score.ts`, in
 * ordinary TypeScript. A model asked for "a trust score out of 100" will drift
 * by ten points between two runs on the same picture; a model asked "is the
 * face clearly visible" will not. Every number in a Blink report is arithmetic
 * over answers like that one.
 */

const evidence = z
  .string()
  .max(180)
  .describe("Literal detail seen in the image. No advice, no score, no praise.");

export const AvatarSchema = z.object({
  present: z.boolean(),
  subject: z
    .enum([
      "face-close",
      "face-with-context",
      "person-distant",
      "group",
      "object",
      "logo",
      "text",
      "illustration",
      "landscape",
      "unclear",
      "none",
    ])
    .describe("What the profile picture actually shows."),
  faceVisibility: z.enum(["clear", "partial", "obscured", "none"]),
  framing: z.enum(["well-centred", "slightly-off", "awkwardly-cropped", "unknown"]),
  sharpness: z.enum(["sharp", "acceptable", "soft", "unknown"]),
  separationFromBackground: z
    .enum(["high", "medium", "low", "unknown"])
    .describe("Does the subject stand out from its background at thumbnail size?"),
  readableAtThumbnailSize: z.boolean(),
  evidence,
});

export const NameSchema = z.object({
  displayNamePresent: z.boolean(),
  displayName: z.string().max(80).nullable(),
  handle: z.string().max(60).nullable(),
  handleReadability: z
    .enum(["instant", "workable", "hard"])
    .describe("Could a stranger read it once and retype it later?"),
  handleHasDigits: z.boolean(),
  handleHasSeparators: z.boolean().describe("Underscores, dots or dashes."),
  handleMatchesDisplayName: z.boolean(),
  verified: z.boolean(),
  evidence,
});

export const BioSchema = z.object({
  present: z.boolean(),
  lineCount: z.number().int().min(0).max(12),
  saysWhoTheyAre: z.boolean(),
  saysWhatTheyDo: z.boolean(),
  saysWhoItIsFor: z.boolean(),
  hasProof: z
    .boolean()
    .describe("Numbers, credentials, named clients, results — anything checkable."),
  hasCallToAction: z.boolean(),
  hasLink: z.boolean(),
  emojiUse: z.enum(["none", "restrained", "heavy"]),
  toneClarity: z
    .enum(["immediate", "needs-a-reread", "vague", "empty"])
    .describe("How long it takes to understand what this account is."),
  usesInsideJokesOrAbstractions: z.boolean(),
  evidence,
});

export const HighlightsSchema = z.object({
  present: z.boolean(),
  count: z.number().int().min(0).max(30),
  coversLookDesigned: z
    .boolean()
    .describe("Deliberate covers rather than whatever frame was grabbed."),
  titlesLegible: z.boolean(),
  titlesDescriptive: z
    .boolean()
    .describe("Titles that name a topic, not 'a', '🌸' or 'me'."),
  coverStyleConsistent: z.boolean(),
  evidence,
});

export const GridSchema = z.object({
  visibleTiles: z.number().int().min(0).max(24),
  dominantSubject: z.enum([
    "faces",
    "people",
    "products",
    "places",
    "food",
    "text-graphics",
    "screenshots",
    "art",
    "mixed",
    "unknown",
  ]),
  colourConsistency: z.enum(["unified", "related", "mixed", "chaotic"]),
  brightness: z.enum(["bright", "mid", "dark", "inconsistent"]),
  editingConsistency: z
    .enum(["one-hand", "mostly-consistent", "varied", "unrelated"])
    .describe("Do the tiles look edited by one person to one recipe?"),
  textOnImages: z.enum(["none", "some", "most"]),
  framingVariety: z
    .enum(["deliberate", "repetitive", "random"])
    .describe("Rhythm across the grid: does it vary on purpose or by accident?"),
  hasRepeatedMotif: z.boolean(),
  firstRowStrongerThanRest: z.boolean(),
  evidence,
});

export const PaletteSchema = z.object({
  dominantColours: z
    .array(z.string().regex(/^#[0-9a-fA-F]{6}$/))
    .min(1)
    .max(5)
    .describe("Sampled from the grid and avatar, strongest first, as #rrggbb."),
  saturation: z.enum(["muted", "moderate", "vivid", "clashing"]),
  temperature: z.enum(["warm", "neutral", "cool", "mixed"]),
  coherence: z.enum(["signature", "consistent", "loose", "none"]),
});

export const HierarchySchema = z.object({
  firstThingSeen: z.enum([
    "profile-picture",
    "display-name",
    "bio",
    "highlights",
    "counts",
    "grid",
    "nothing-dominant",
  ]),
  competingElements: z
    .number()
    .int()
    .min(0)
    .max(8)
    .describe("How many things fight for attention at the same weight."),
  density: z.enum(["generous", "balanced", "cramped"]),
  readingOrderIsObvious: z.boolean(),
  evidence,
});

export const SignalsSchema = z.object({
  followerCountText: z.string().max(24).nullable(),
  postCountText: z.string().max(24).nullable(),
  followerToPostBalance: z.enum(["healthy", "thin-feed", "quiet-audience", "unknown"]),
  looksActive: z.boolean(),
  hasBusinessSignals: z
    .boolean()
    .describe("Category label, contact buttons, professional dashboard."),
  evidence,
});

export const ImpressionSchema = z.object({
  archetype: z
    .string()
    .max(40)
    .describe("Two to four words naming the impression, e.g. 'Quiet Specialist'."),
  strangerRead: z
    .string()
    .max(220)
    .describe("One sentence: what a stranger concludes in the first seconds."),
  strongestDetail: evidence,
  mostDamagingDetail: evidence,
  guessableProfession: z.boolean(),
  feelsIntentional: z.boolean(),
  wouldRememberTomorrow: z.enum(["yes", "maybe", "no"]),
});

export const ObservationSchema = z.object({
  isProfileScreenshot: z
    .boolean()
    .describe("False for anything that is not a social profile screenshot."),
  platformGuess: z.enum(["instagram", "other-social", "not-social", "unclear"]),
  captureQuality: z.enum(["clean", "partial", "obstructed", "unusable"]),
  avatar: AvatarSchema,
  name: NameSchema,
  bio: BioSchema,
  highlights: HighlightsSchema,
  grid: GridSchema,
  palette: PaletteSchema,
  hierarchy: HierarchySchema,
  signals: SignalsSchema,
  impression: ImpressionSchema,
});

export type Observation = z.infer<typeof ObservationSchema>;

/* ── Stage two: the writing pass ──────────────────────────────────────────
   Given the observation and the scores already computed from it, write the
   report. This stage never sees the image, so it cannot invent a visual fact
   that stage one did not record. */

const MetricNarrativeSchema = z.object({
  key: z.string(),
  detected: z
    .string()
    .max(200)
    .describe("What Blink saw, stated as observation. Concrete nouns from the profile."),
  whatLowersIt: z
    .string()
    .max(220)
    .describe("The specific thing on this profile holding the score down."),
  howToImprove: z
    .string()
    .max(240)
    .describe("One instruction the person could carry out this afternoon."),
  expectedImpact: z
    .string()
    .max(140)
    .describe("What changes for a stranger afterwards. No numbers."),
});

export const NarrativeSchema = z.object({
  headline: z
    .string()
    .max(180)
    .describe("One sentence on the impression formed in the first seconds. Direct, kind, specific."),
  metrics: z.array(MetricNarrativeSchema).min(8).max(8),
  strength: z.object({
    title: z.string().max(60),
    detail: z.string().max(320),
  }),
  risk: z.object({
    title: z.string().max(60),
    detail: z.string().max(320),
  }),
  actions: z
    .array(
      z.object({
        title: z.string().max(70),
        detail: z.string().max(300),
        effort: z.string().max(40).describe("Honest time cost, e.g. '10 minutes'."),
        lift: z.string().max(40).describe("e.g. 'Trust +9'."),
      }),
    )
    .min(3)
    .max(3),
  quickWins: z.array(z.string().max(120)).min(3).max(4),
  verdict: z
    .string()
    .max(360)
    .describe("Two or three sentences. What this profile is, and what it could be."),
});

export type Narrative = z.infer<typeof NarrativeSchema>;
