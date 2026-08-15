import type { PerceptionReport } from "@/types/report";
import { METRIC_META } from "@/lib/analysis/metrics";

/**
 * The sample report.
 *
 * One report, written by hand, about the vector profile the product shows in its
 * own films. It exists so someone can see the whole experience before uploading
 * anything of their own — and it is labelled `source: "sample"` everywhere it
 * appears, because a demo presented as an analysis is a lie.
 *
 * Real uploads never come from here. When no model is connected, the upload step
 * says so rather than quietly serving this.
 */

const metric = (
  key: keyof typeof METRIC_META,
  score: number,
  copy: {
    detected: string;
    whatLowersIt: string;
    howToImprove: string;
    expectedImpact: string;
  },
) => ({
  key,
  label: METRIC_META[key].label,
  whyItMatters: METRIC_META[key].whyItMatters,
  score,
  ...copy,
});

export const SAMPLE_REPORT: PerceptionReport = {
  id: "sample",
  createdAt: "2026-01-01T00:00:00.000Z",
  source: "sample",
  overall: 78,
  archetype: "Composed, quietly premium",
  headline:
    "You read as credible almost immediately, and then people hesitate, because nothing on the screen says what you actually do.",
  strangerRead:
    "Someone with real taste whose work I can't categorise, so I admire it and keep scrolling.",
  attentionSeconds: 1.8,
  percentile: 86,
  metrics: [
    metric("firstImpression", 84, {
      detected:
        "A sharp greyscale portrait, a short display name, and a grid in one narrow palette. The eye settles rather than scans.",
      whatLowersIt:
        "The top grid row is three abstract frames, so after the picture there is nothing specific for attention to land on.",
      howToImprove:
        "Move a photo with a face or an unmistakable subject into the top-left tile, so the eye has a second place to stop.",
      expectedImpact:
        "The first glance finds a person and a subject instead of a mood.",
    }),
    metric("trust", 86, {
      detected:
        "A real face, clearly lit, centred and sharp at thumbnail size. The display name and the handle are the same name.",
      whatLowersIt:
        "The link sits bare at the end of the bio with nothing saying where it goes, which reads faintly transactional.",
      howToImprove:
        "Put three words in front of the link naming what is on the other side.",
      expectedImpact:
        "The last thing a stranger reads becomes an invitation rather than a request.",
    }),
    metric("authority", 62, {
      detected:
        "Careful work, described in atmosphere. No number, client, year or result appears anywhere above the grid.",
      whatLowersIt:
        "Nothing on the first screen is checkable, so there is nothing for a stranger to weigh.",
      howToImprove:
        "Add one verifiable fact to the bio — years working, pieces made, or where the work has been shown.",
      expectedImpact:
        "Interest starts converting into messages instead of stopping at admiration.",
    }),
    metric("visualQuality", 91, {
      detected:
        "Even exposure across every visible tile, one light, one grade. Two frames in the third row are softer than the rest.",
      whatLowersIt:
        "The two soft tiles break an otherwise unbroken run of sharp frames.",
      howToImprove: "Replace those two tiles, or move them below the third row.",
      expectedImpact:
        "The grid reads as a body of work with no visible seam in it.",
    }),
    metric("profileClarity", 58, {
      detected:
        "The first bio line describes a feeling. Neither the handle nor the name suggests a field, and the grid could belong to several.",
      whatLowersIt:
        "Working out what this account is takes a second read, and most people do not take it.",
      howToImprove:
        "Rewrite line one as what you make, for whom, where. Six concrete words is enough.",
      expectedImpact:
        "Strangers can categorise you in the first second, which is when they decide.",
    }),
    metric("profileConsistency", 88, {
      detected:
        "One palette and one light across the grid. Highlight covers sit slightly outside that colour range.",
      whatLowersIt:
        "The covers were made separately from the photographs and it shows in the greens.",
      howToImprove:
        "Rebuild the four highlight covers using colours sampled from your own photographs.",
      expectedImpact:
        "The whole page reads as one decision instead of two that nearly match.",
    }),
    metric("memorability", 68, {
      detected:
        "The palette is recognisable. Nothing repeats across the grid — no motif, framing habit or format.",
      whatLowersIt:
        "There is no single image or phrase specific enough to survive a scroll.",
      howToImprove:
        "Repeat one visual habit — a framing, a backdrop, a caption shape — in every third post.",
      expectedImpact:
        "People start recognising your work before they see your name on it.",
    }),
    metric("socialPresence", 74, {
      detected:
        "Four organised highlights, a healthy ratio of posts to followers, and a link in the bio.",
      whatLowersIt:
        "Nothing on the first screen shows recency — no date, no drop, no current status.",
      howToImprove:
        "Add a line to the bio saying what is open, on, or shipping this month.",
      expectedImpact:
        "The account reads as live, so following it feels like joining something.",
    }),
  ],
  strength: {
    title: "The grid is doing the work of a portfolio",
    detail:
      "Nine frames sharing one palette and one light read as taste before a single word is processed. That is why credibility lands in the first second, and most profiles never earn it at all.",
  },
  risk: {
    title: "You are being admired and skipped",
    detail:
      "A stranger spends about a second deciding whether you are relevant to them. Right now the profile answers is this good before it answers is this for me, so the people most likely to hire you keep scrolling.",
  },
  actions: [
    {
      title: "Rewrite the first bio line as an offer",
      detail:
        "Replace the atmosphere line with what you make, who it is for, and where you are. Concrete nouns outperform adjectives at this size: 'Hand-thrown tableware for restaurants, Lisbon' beats anything evocative.",
      effort: "2 minutes",
      lift: "Profile clarity +16",
    },
    {
      title: "Put one proof point above the grid",
      detail:
        "Add a single checkable detail — a count, a year, a stockist, a named project. One fact does more for authority than three superlatives.",
      effort: "5 minutes",
      lift: "Authority +11",
    },
    {
      title: "Anchor the first grid row",
      detail:
        "Reorder so the top-left tile holds a face or an unmistakable subject. The eye needs one place to land before it will explore the other eight.",
      effort: "3 minutes",
      lift: "First impression +6",
    },
  ],
  quickWins: [
    "Crop the profile photo tighter — chin to hairline",
    "Cut the emoji from line two",
    "Name each highlight in one word",
    "Add three words of context before the link",
  ],
  verdict:
    "This profile has already won the hard part: people believe it on sight. Say what it is in the first six words and it stops being admired and starts being followed.",
  detected: {
    avatar: true,
    name: true,
    bio: true,
    highlights: true,
    grid: true,
    palette: ["#2a2723", "#8d8375", "#c9c2b6", "#4a5a4e"],
  },
};
