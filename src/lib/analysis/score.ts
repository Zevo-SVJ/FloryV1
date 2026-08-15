import type { Observation } from "@/lib/ai/schema";
import type { MetricKey } from "@/types/report";
import { clamp } from "@/lib/utils";

/**
 * From observation to number, without the model's help.
 *
 * The model answers narrow factual questions; this file turns those answers
 * into the eight scores. Doing the arithmetic here rather than asking for it is
 * what makes two runs on the same screenshot agree, and two similar
 * screenshots land within a point or two of each other.
 *
 * Each signal below is a 0–1 reading of one aspect of the profile. Each metric
 * is a weighted average of the signals that genuinely bear on it. Nothing is
 * random and nothing is seeded.
 */

const pick = <T extends string>(
  value: T,
  table: Record<T, number>,
): number => table[value];

const bool = (value: boolean, yes = 1, no = 0) => (value ? yes : no);

/** How close a count is to an ideal window, falling off gently outside it. */
function window(value: number, low: number, high: number, falloff: number) {
  if (value >= low && value <= high) return 1;
  const distance = value < low ? low - value : value - high;
  return clamp(1 - distance / falloff, 0, 1);
}

export type SignalKey = keyof ReturnType<typeof signals>;

export function signals(o: Observation) {
  const avatarSubject = pick(o.avatar.subject, {
    "face-close": 1,
    "face-with-context": 0.9,
    "person-distant": 0.5,
    group: 0.4,
    logo: 0.72,
    object: 0.42,
    illustration: 0.6,
    landscape: 0.3,
    text: 0.35,
    unclear: 0.15,
    none: 0,
  });

  const avatarFace = pick(o.avatar.faceVisibility, {
    clear: 1,
    partial: 0.55,
    obscured: 0.22,
    none: o.avatar.subject === "logo" ? 0.62 : 0.1,
  });

  const avatarCraft =
    0.3 * pick(o.avatar.framing, {
      "well-centred": 1,
      "slightly-off": 0.6,
      "awkwardly-cropped": 0.15,
      unknown: 0.5,
    }) +
    0.28 * pick(o.avatar.sharpness, {
      sharp: 1,
      acceptable: 0.62,
      soft: 0.2,
      unknown: 0.5,
    }) +
    0.24 * pick(o.avatar.separationFromBackground, {
      high: 1,
      medium: 0.6,
      low: 0.2,
      unknown: 0.5,
    }) +
    0.18 * bool(o.avatar.readableAtThumbnailSize, 1, 0.15);

  const bioClarity = pick(o.bio.toneClarity, {
    immediate: 1,
    "needs-a-reread": 0.52,
    vague: 0.22,
    empty: 0,
  });

  const bioSubstance =
    (bool(o.bio.saysWhoTheyAre) +
      bool(o.bio.saysWhatTheyDo) +
      bool(o.bio.saysWhoItIsFor)) /
    3;

  const bioDiscipline =
    0.5 * window(o.bio.lineCount, 1, 3, 3) +
    0.28 *
      pick(o.bio.emojiUse, { none: 0.82, restrained: 1, heavy: 0.28 }) +
    0.22 * bool(o.bio.usesInsideJokesOrAbstractions, 0.2, 1);

  const handleClarity =
    0.6 *
      pick(o.name.handleReadability, { instant: 1, workable: 0.58, hard: 0.2 }) +
    0.2 * bool(o.name.handleHasDigits, 0.3, 1) +
    0.2 * bool(o.name.handleHasSeparators, 0.62, 1);

  const nameCoherence =
    0.55 * bool(o.name.displayNamePresent, 1, 0) +
    0.45 * bool(o.name.handleMatchesDisplayName, 1, 0.42);

  const highlightCraft = !o.highlights.present
    ? 0.14
    : 0.24 * window(o.highlights.count, 3, 7, 5) +
      0.22 * bool(o.highlights.coversLookDesigned, 1, 0.3) +
      0.18 * bool(o.highlights.titlesLegible, 1, 0.25) +
      0.2 * bool(o.highlights.titlesDescriptive, 1, 0.3) +
      0.16 * bool(o.highlights.coverStyleConsistent, 1, 0.35);

  const gridCohesion =
    0.38 *
      pick(o.grid.colourConsistency, {
        unified: 1,
        related: 0.76,
        mixed: 0.4,
        chaotic: 0.12,
      }) +
    0.34 *
      pick(o.grid.editingConsistency, {
        "one-hand": 1,
        "mostly-consistent": 0.74,
        varied: 0.38,
        unrelated: 0.1,
      }) +
    0.28 *
      pick(o.grid.framingVariety, {
        deliberate: 1,
        repetitive: 0.58,
        random: 0.24,
      });

  const gridCraft =
    0.4 *
      pick(o.grid.brightness, {
        bright: 0.92,
        mid: 1,
        dark: 0.78,
        inconsistent: 0.3,
      }) +
    0.3 * pick(o.grid.textOnImages, { none: 0.9, some: 1, most: 0.42 }) +
    0.3 * window(o.grid.visibleTiles, 6, 24, 6);

  const paletteCoherence = pick(o.palette.coherence, {
    signature: 1,
    consistent: 0.76,
    loose: 0.38,
    none: 0.14,
  });

  const paletteControl =
    0.55 *
      pick(o.palette.saturation, {
        muted: 0.86,
        moderate: 1,
        vivid: 0.78,
        clashing: 0.18,
      }) +
    0.45 *
      pick(o.palette.temperature, {
        warm: 0.92,
        neutral: 0.92,
        cool: 0.92,
        mixed: 0.44,
      });

  const hierarchy =
    0.4 * bool(o.hierarchy.readingOrderIsObvious, 1, 0.28) +
    0.32 * clamp(1 - Math.max(0, o.hierarchy.competingElements - 2) / 4, 0, 1) +
    0.28 *
      pick(o.hierarchy.density, {
        generous: 1,
        balanced: 0.85,
        cramped: 0.32,
      });

  /* A profile whose first read lands on the picture or the name is being read
     the way its owner intended. One whose first read is the counts, or
     nothing, is being read by accident. */
  const entryPoint = pick(o.hierarchy.firstThingSeen, {
    "profile-picture": 1,
    "display-name": 0.92,
    bio: 0.8,
    highlights: 0.6,
    grid: 0.72,
    counts: 0.4,
    "nothing-dominant": 0.16,
  });

  const activity =
    0.5 * bool(o.signals.looksActive, 1, 0.28) +
    0.5 *
      pick(o.signals.followerToPostBalance, {
        healthy: 1,
        "thin-feed": 0.46,
        "quiet-audience": 0.58,
        unknown: 0.6,
      });

  const recall = pick(o.impression.wouldRememberTomorrow, {
    yes: 1,
    maybe: 0.5,
    no: 0.14,
  });

  const capture = pick(o.captureQuality, {
    clean: 1,
    partial: 0.82,
    obstructed: 0.6,
    unusable: 0.4,
  });

  return {
    avatarSubject,
    avatarFace,
    avatarCraft,
    bioClarity,
    bioSubstance,
    bioDiscipline,
    bioProof: bool(o.bio.hasProof, 1, 0.22),
    bioCta: bool(o.bio.hasCallToAction, 1, 0.4),
    bioLink: bool(o.bio.hasLink, 1, 0.45),
    handleClarity,
    nameCoherence,
    highlightCraft,
    gridCohesion,
    gridCraft,
    paletteCoherence,
    paletteControl,
    hierarchy,
    entryPoint,
    activity,
    business: bool(o.signals.hasBusinessSignals, 1, 0.5),
    verified: bool(o.name.verified, 1, 0.68),
    recall,
    motif: bool(o.grid.hasRepeatedMotif, 1, 0.35),
    intentional: bool(o.impression.feelsIntentional, 1, 0.24),
    guessable: bool(o.impression.guessableProfession, 1, 0.3),
    capture,
  };
}

type Weights = Partial<Record<SignalKey, number>>;

/**
 * What each dimension is made of.
 *
 * The weights are the opinionated part of Blink, and they are stated here in
 * one place rather than buried in prose so they can be argued with.
 */
const MODEL: Record<MetricKey, Weights> = {
  firstImpression: {
    avatarFace: 1.6,
    avatarCraft: 1.2,
    entryPoint: 1.1,
    bioClarity: 1.3,
    hierarchy: 1,
    gridCohesion: 0.9,
    intentional: 0.9,
  },
  trust: {
    avatarFace: 1.5,
    avatarSubject: 0.8,
    nameCoherence: 1.1,
    bioSubstance: 1.2,
    bioProof: 1,
    activity: 0.9,
    verified: 0.4,
    capture: 0.4,
  },
  authority: {
    bioProof: 1.6,
    bioSubstance: 1.2,
    guessable: 1.2,
    business: 0.7,
    gridCohesion: 0.9,
    highlightCraft: 0.7,
    activity: 0.6,
  },
  visualQuality: {
    avatarCraft: 1.3,
    gridCraft: 1.5,
    paletteControl: 1.2,
    gridCohesion: 1,
    capture: 0.5,
  },
  profileClarity: {
    bioClarity: 1.8,
    bioSubstance: 1.4,
    handleClarity: 1.1,
    guessable: 1.2,
    hierarchy: 0.9,
    bioDiscipline: 0.8,
    bioCta: 0.5,
  },
  profileConsistency: {
    gridCohesion: 1.8,
    paletteCoherence: 1.5,
    highlightCraft: 0.9,
    nameCoherence: 0.7,
    intentional: 0.9,
  },
  memorability: {
    recall: 1.7,
    motif: 1.1,
    paletteCoherence: 1.1,
    avatarSubject: 0.9,
    handleClarity: 0.8,
    intentional: 0.7,
  },
  socialPresence: {
    activity: 1.6,
    highlightCraft: 1,
    bioLink: 0.7,
    business: 0.7,
    gridCraft: 0.8,
    verified: 0.5,
  },
};

/** Contribution of the overall score, dimension by dimension. */
const OVERALL_WEIGHTS: Record<MetricKey, number> = {
  firstImpression: 1.8,
  trust: 1.5,
  profileClarity: 1.4,
  visualQuality: 1.1,
  profileConsistency: 1.1,
  memorability: 1,
  authority: 1,
  socialPresence: 0.7,
};

/**
 * 0–1 signals map onto 14–98 rather than 0–100.
 *
 * Nothing real is a zero, and a perfect hundred would make the report a
 * flatterer. The floor and ceiling keep the number honest at both ends.
 */
const FLOOR = 14;
const CEILING = 98;

function scoreFrom(weights: Weights, values: ReturnType<typeof signals>): number {
  let total = 0;
  let weight = 0;
  for (const [key, w] of Object.entries(weights) as [SignalKey, number][]) {
    total += values[key] * w;
    weight += w;
  }
  const ratio = weight === 0 ? 0 : total / weight;
  return clamp(Math.round(FLOOR + ratio * (CEILING - FLOOR)), FLOOR, CEILING);
}

export interface Scored {
  metrics: Record<MetricKey, number>;
  overall: number;
  attentionSeconds: number;
  percentile: number;
}

export function score(observation: Observation): Scored {
  const values = signals(observation);

  const metrics = Object.fromEntries(
    (Object.keys(MODEL) as MetricKey[]).map((key) => [
      key,
      scoreFrom(MODEL[key], values),
    ]),
  ) as Record<MetricKey, number>;

  let total = 0;
  let weight = 0;
  for (const key of Object.keys(OVERALL_WEIGHTS) as MetricKey[]) {
    total += metrics[key] * OVERALL_WEIGHTS[key];
    weight += OVERALL_WEIGHTS[key];
  }
  const overall = clamp(Math.round(total / weight), FLOOR, CEILING);

  /* A clear profile is read faster than a confusing one — the number goes down
     as the score goes up, and it is a consequence of the score, not a guess. */
  const attentionSeconds =
    Math.round(clamp(3.4 - (overall / 100) * 2.1, 0.9, 3.4) * 10) / 10;

  /* A soft curve rather than a straight line: the middle of the distribution is
     crowded, so a few points near the centre move the percentile more than a
     few points near either edge. */
  const t = (overall - FLOOR) / (CEILING - FLOOR);
  const percentile = clamp(Math.round(100 / (1 + Math.exp(-7.2 * (t - 0.52)))), 3, 99);

  return { metrics, overall, attentionSeconds, percentile };
}
