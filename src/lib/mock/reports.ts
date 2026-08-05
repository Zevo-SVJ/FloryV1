import type { PerceptionReport } from "@/types/report";

/**
 * Three complete reports, written as a perception analyst would write them.
 *
 * They exist so the demo tells the truth about what the product feels like:
 * specific, a little uncomfortable, and useful. The engine picks one from the
 * uploaded file and nudges the numbers so no two runs look identical.
 */

export const MOCK_REPORTS: PerceptionReport[] = [
  {
    id: "composed",
    createdAt: "",
    overall: 84,
    archetype: "Composed, quietly premium",
    summary:
      "Strangers read you as credible within the first second — and then hesitate, because nothing tells them what you actually do.",
    attentionSeconds: 2.4,
    percentile: 91,
    metrics: [
      {
        key: "firstImpression",
        label: "First Impression",
        score: 86,
        note: "Restraint reads as confidence. The eye settles instead of scanning.",
      },
      {
        key: "trust",
        label: "Trust",
        score: 89,
        note: "Consistent tones and a real face. Very little here asks to be doubted.",
      },
      {
        key: "authority",
        label: "Authority",
        score: 72,
        note: "You look capable, but nothing states what you are capable of.",
      },
      {
        key: "visualQuality",
        label: "Visual Quality",
        score: 92,
        note: "Even exposure across the grid. This is the strongest signal you send.",
      },
      {
        key: "personality",
        label: "Personality",
        score: 68,
        note: "Polished to the point of anonymous. Nothing risky, nothing memorable.",
      },
      {
        key: "memorability",
        label: "Memorability",
        score: 74,
        note: "Recognisable palette, forgettable first line.",
      },
    ],
    strength: {
      title: "Visual consistency",
      detail:
        "Your first nine frames share one palette and one light. A stranger reads that as taste before they read a single word — it is the reason your credibility lands so early.",
    },
    weakness: {
      title: "Your bio explains a mood, not a person",
      detail:
        "The first line is atmosphere. Strangers spend roughly a second deciding whether you are relevant to them, and atmosphere does not answer that question.",
    },
    improvements: [
      {
        title: "Lead the bio with the outcome you create",
        detail:
          "Replace the opening line with what someone gets from you. Concrete nouns outperform adjectives at this size.",
        lift: "+11 authority",
      },
      {
        title: "Give the first grid row one clear subject",
        detail:
          "Three abstract frames in a row make the eye slide off. One face or one product anchors the whole grid.",
        lift: "+7 first impression",
      },
      {
        title: "Name your highlights in one word each",
        detail:
          "Two-word labels read as clutter at thumbnail size. One word each turns them into navigation.",
        lift: "+6 memorability",
      },
    ],
    quickWins: [
      "Crop the profile photo tighter — chin to hairline",
      "Move the newest work to the top-left tile",
      "Cut the emoji in line two",
      "Match highlight covers to your grid palette",
    ],
    verdict:
      "You are being taken seriously and skipped at the same time. Say what you do in the first six words and this profile stops being admired and starts being followed.",
  },
  {
    id: "underSold",
    createdAt: "",
    overall: 71,
    archetype: "Substantial, under-framed",
    summary:
      "There is real work here, but the profile makes a stranger do the work of finding it.",
    attentionSeconds: 1.8,
    percentile: 64,
    metrics: [
      {
        key: "firstImpression",
        label: "First Impression",
        score: 66,
        note: "The eye enters at the grid, not at you. Attention starts in the wrong place.",
      },
      {
        key: "trust",
        label: "Trust",
        score: 78,
        note: "Nothing feels staged. Trust is quietly intact.",
      },
      {
        key: "authority",
        label: "Authority",
        score: 81,
        note: "The captions carry expertise the top of the profile never claims.",
      },
      {
        key: "visualQuality",
        label: "Visual Quality",
        score: 61,
        note: "Mixed white balance between frames. Warm and cool tiles fight each other.",
      },
      {
        key: "personality",
        label: "Personality",
        score: 74,
        note: "A specific voice shows up — three scrolls too late.",
      },
      {
        key: "memorability",
        label: "Memorability",
        score: 63,
        note: "Nothing visually repeats, so nothing accumulates.",
      },
    ],
    strength: {
      title: "Evidence of real depth",
      detail:
        "Your captions read like someone who has actually done the thing. That is rare, and it is why people who scroll past the first screen convert well.",
    },
    weakness: {
      title: "The top of the profile undersells everything below it",
      detail:
        "Photo, name and bio are the only elements most strangers ever evaluate. Right now they set a lower expectation than your work deserves.",
    },
    improvements: [
      {
        title: "Put your face in the profile photo",
        detail:
          "A logo mark at 40px reads as a brand account, which lowers trust for individual expertise.",
        lift: "+13 trust",
      },
      {
        title: "Colour-correct the grid to one temperature",
        detail:
          "Pick warm or cool and re-edit the nine visible tiles. Consistency is read as quality before content is.",
        lift: "+15 visual quality",
      },
      {
        title: "Promote your best caption into the bio",
        detail:
          "The sharpest sentence on your profile is buried in a post. It belongs where the decision happens.",
        lift: "+9 authority",
      },
    ],
    quickWins: [
      "Remove the link-in-bio emoji chain",
      "Reorder so a face appears in the first three tiles",
      "Add one number to the bio — years, clients, results",
      "Archive the two lowest-quality tiles",
    ],
    verdict:
      "This is a profile that rewards patience in a place where nobody is patient. Fix the first screen and the rest of it finally gets seen.",
  },
  {
    id: "loud",
    createdAt: "",
    overall: 63,
    archetype: "Energetic, hard to place",
    summary:
      "You register instantly and blur immediately — strangers feel the energy but cannot name what you are.",
    attentionSeconds: 1.4,
    percentile: 42,
    metrics: [
      {
        key: "firstImpression",
        label: "First Impression",
        score: 72,
        note: "High contrast pulls the eye in fast. Nothing holds it once it arrives.",
      },
      {
        key: "trust",
        label: "Trust",
        score: 54,
        note: "Competing colours and stacked text read as urgency, which reads as selling.",
      },
      {
        key: "authority",
        label: "Authority",
        score: 49,
        note: "Volume is standing in for proof. Strangers discount claims without evidence.",
      },
      {
        key: "visualQuality",
        label: "Visual Quality",
        score: 58,
        note: "Heavy filters flatten detail. Three tiles are visibly compressed.",
      },
      {
        key: "personality",
        label: "Personality",
        score: 88,
        note: "Unmistakably yours. This is the asset the rest of the profile is wasting.",
      },
      {
        key: "memorability",
        label: "Memorability",
        score: 79,
        note: "People will remember the feeling. They will not remember the offer.",
      },
    ],
    strength: {
      title: "A voice nobody could mistake",
      detail:
        "Personality is the hardest score to move and you already have it. Every other number here is a framing problem, not a character problem.",
    },
    weakness: {
      title: "Nothing establishes why you should be believed",
      detail:
        "There is no proof anywhere in the first screen — no result, no client, no number. Confidence without evidence reads as pressure.",
    },
    improvements: [
      {
        title: "Trade one hype line for one specific proof",
        detail:
          "A single verifiable detail outperforms three superlatives at building authority in the first read.",
        lift: "+16 authority",
      },
      {
        title: "Reduce the palette to two colours plus neutral",
        detail:
          "The grid currently competes with itself. Restraint will make the energy feel intentional instead of loud.",
        lift: "+12 trust",
      },
      {
        title: "Re-upload the three compressed tiles",
        detail:
          "Visible artefacts at thumbnail size read as low effort, and low effort reads as low quality.",
        lift: "+10 visual quality",
      },
    ],
    quickWins: [
      "Drop the all-caps line to sentence case",
      "Keep one exclamation mark, at most",
      "Replace the busiest tile with a clean portrait",
      "Turn the strongest testimonial into a highlight cover",
    ],
    verdict:
      "You have the part most people never get. Turn the volume down ten percent, add one piece of proof, and this becomes a profile people trust as fast as they notice it.",
  },
];
