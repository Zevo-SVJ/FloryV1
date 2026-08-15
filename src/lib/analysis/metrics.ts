import type { MetricKey } from "@/types/report";

/**
 * The eight dimensions, described once.
 *
 * A label and a reason. `whyItMatters` is a property of the dimension, not of
 * any particular profile, so it is written here rather than generated — which
 * also means it reads the same in every report a person ever runs.
 */

export interface MetricMeta {
  key: MetricKey;
  label: string;
  /** For the model: what it is being asked to write about. */
  brief: string;
  whyItMatters: string;
}

export const METRIC_META: Record<MetricKey, MetricMeta> = {
  firstImpression: {
    key: "firstImpression",
    label: "First impression",
    brief:
      "The read a stranger forms before they have decided to read anything: picture, name, the shape of the page.",
    whyItMatters:
      "Almost nobody reads a profile. They glance, feel something, and act on the feeling. Whatever this number is, it is the version of you most people will ever meet.",
  },
  trust: {
    key: "trust",
    label: "Trust",
    brief:
      "Whether the profile reads as a real, present person rather than an account.",
    whyItMatters:
      "Trust is the gate in front of everything else. A stranger who is unsure whether you are real does not follow, message or buy — they just leave, and they never tell you why.",
  },
  authority: {
    key: "authority",
    label: "Authority",
    brief:
      "Whether it is obvious that this person knows something worth knowing, and what.",
    whyItMatters:
      "Authority is what turns interest into weight. Without it a profile can be liked and still ignored, because nothing suggests there is anything to learn or gain by staying.",
  },
  visualQuality: {
    key: "visualQuality",
    label: "Visual quality",
    brief:
      "Craft: sharpness, framing, exposure, colour control across the avatar and the grid.",
    whyItMatters:
      "Craft is read as care, and care is read as competence. People will not describe a profile as badly exposed; they will simply conclude that whatever it is selling is probably not very good.",
  },
  profileClarity: {
    key: "profileClarity",
    label: "Profile clarity",
    brief:
      "How quickly a stranger can say what this account is and who it is for.",
    whyItMatters:
      "Confusion costs more than disagreement. If it takes a second read to work out what you do, most people will not take it — the follow they were half-considering quietly disappears.",
  },
  profileConsistency: {
    key: "profileConsistency",
    label: "Consistency",
    brief:
      "Whether the picture, the highlights and the grid look like one intent or several.",
    whyItMatters:
      "Consistency is how a stranger predicts what they are subscribing to. A feed that changes register every few posts feels like a risk, and following is a small act of optimism people rarely spend on risk.",
  },
  memorability: {
    key: "memorability",
    label: "Memorability",
    brief:
      "Whether anything here would still be in someone's head tomorrow.",
    whyItMatters:
      "Most profiles are pleasant and forgotten within a minute. Being remembered is what turns a single glance into a second visit, and second visits are where followers actually come from.",
  },
  socialPresence: {
    key: "socialPresence",
    label: "Social presence",
    brief:
      "Signs of an account that is alive: recent activity, organised highlights, somewhere to go next.",
    whyItMatters:
      "People check whether anyone is home before they knock. A profile that looks dormant gets treated as dormant, however good the work on it happens to be.",
  },
};

export const METRIC_KEYS = Object.keys(METRIC_META) as MetricKey[];

export const metricLabel = (key: MetricKey) => METRIC_META[key].label;
