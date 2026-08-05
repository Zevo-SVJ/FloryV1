import type { PerceptionReport } from "@/types/report";

/**
 * Three complete reports, written the way a perception analyst would write
 * them: specific, slightly uncomfortable, and immediately actionable. The
 * engine picks one from the uploaded file and nudges the numbers, so no two
 * runs look identical and the same screenshot always scores the same.
 *
 * Every `howToImprove` is an instruction, not advice. Every `whatLowersIt`
 * names something that is actually on the profile.
 */

export const MOCK_REPORTS: PerceptionReport[] = [
  {
    id: "composed",
    createdAt: "",
    overall: 82,
    archetype: "Composed, quietly premium",
    headline:
      "You read as credible almost instantly — then people hesitate, because nothing tells them what you actually do.",
    attentionSeconds: 2.4,
    percentile: 91,
    metrics: [
      {
        key: "firstImpression",
        label: "First Impression",
        score: 86,
        reading:
          "The eye settles instead of scanning. Restraint is being read as confidence.",
        whyItMatters:
          "This is the only score formed before anything is read. It sets what everything else has to overcome.",
        whatLowersIt:
          "The first grid row is three abstract frames, so there is nothing for attention to land on.",
        howToImprove:
          "Move a photo with a face or a clear subject into the top-left tile.",
      },
      {
        key: "trust",
        label: "Trust",
        score: 89,
        reading:
          "Consistent tones and a real face. Very little here invites doubt.",
        whyItMatters:
          "Trust decides whether a stranger reads your bio at all, or scrolls past it.",
        whatLowersIt:
          "The link is bare with no context, which reads slightly transactional.",
        howToImprove:
          "Add three words before the link saying what is on the other side.",
      },
      {
        key: "authority",
        label: "Authority",
        score: 71,
        reading:
          "You look capable. Nothing on the first screen states what you are capable of.",
        whyItMatters:
          "Authority is what turns a follow into a message, a booking or a purchase.",
        whatLowersIt:
          "No number, client, year or result appears anywhere above the grid.",
        howToImprove:
          "Put one verifiable fact in the bio — years working, pieces made, or where your work has shown.",
      },
      {
        key: "visualQuality",
        label: "Visual Quality",
        score: 93,
        reading:
          "Even exposure across every visible tile. This is the strongest signal you send.",
        whyItMatters:
          "Quality is judged before content. It is the fastest proxy people have for taste.",
        whatLowersIt: "Two tiles are noticeably softer than the rest.",
        howToImprove:
          "Replace the two soft tiles, or move them below the third row.",
      },
      {
        key: "profileClarity",
        label: "Profile Clarity",
        score: 64,
        reading:
          "A stranger can tell you have taste. They cannot tell what you sell or who you are for.",
        whyItMatters:
          "Clarity is the single biggest lever on follow rate — people follow what they can categorise.",
        whatLowersIt:
          "The first bio line describes a mood rather than an offer or a subject.",
        howToImprove:
          "Rewrite line one as: what you make, for whom, where. Six words is enough.",
      },
      {
        key: "profileConsistency",
        label: "Profile Consistency",
        score: 90,
        reading:
          "One palette, one light, one voice. The profile clearly belongs to one person.",
        whyItMatters:
          "Consistency is what makes a profile feel like a body of work instead of a camera roll.",
        whatLowersIt:
          "Highlight covers sit slightly outside the grid's colour range.",
        howToImprove:
          "Rebuild the four highlight covers using colours pulled from your own photos.",
      },
      {
        key: "memorability",
        label: "Memorability",
        score: 74,
        reading:
          "The palette is recognisable. The opening line is not — nothing sticks after scrolling away.",
        whyItMatters:
          "Memorability decides whether someone comes back a week later or forgets you entirely.",
        whatLowersIt: "No repeated motif, format or phrase across the grid.",
        howToImprove:
          "Repeat one visual habit — a framing, a backdrop, a caption format — in every third post.",
      },
      {
        key: "socialPresence",
        label: "Social Presence",
        score: 78,
        reading:
          "Healthy ratio and steady posting. You read as active without looking anxious.",
        whyItMatters:
          "Presence tells strangers whether the account is alive and worth following now.",
        whatLowersIt:
          "Nothing in the first screen shows recency — no date, drop or current status.",
        howToImprove:
          "Add a current line to the bio: what is open, on, or shipping this month.",
      },
    ],
    strength: {
      title: "Your grid is doing the work of a portfolio",
      detail:
        "Nine frames sharing one palette and one light read as taste before a single word is processed. That is why your credibility lands in the first second — most profiles never earn that.",
    },
    risk: {
      title: "You are being admired and skipped",
      detail:
        "Strangers spend roughly a second deciding whether you are relevant to them. Right now the profile answers is this good before it answers is this for me, so the people most likely to hire you keep scrolling.",
    },
    actions: [
      {
        title: "Rewrite the first bio line as an offer",
        detail:
          "Replace the atmosphere line with: what you make, who it is for, where you are. Concrete nouns outperform adjectives at this size — 'Hand-thrown tableware for restaurants, Lisbon' beats anything evocative.",
        effort: "2 min",
        lift: "Clarity +18",
      },
      {
        title: "Put one proof point above the grid",
        detail:
          "Add a single verifiable detail — a count, a year, a stockist, a named project. One fact does more for authority than three superlatives.",
        effort: "5 min",
        lift: "Authority +11",
      },
      {
        title: "Anchor the first grid row",
        detail:
          "Reorder so the top-left tile has a face or an unmistakable subject. The eye needs one place to land before it will explore the other eight.",
        effort: "3 min",
        lift: "First impression +7",
      },
    ],
    quickWins: [
      "Crop the profile photo tighter — chin to hairline",
      "Cut the emoji from line two",
      "Name each highlight in one word",
      "Add three words of context before your link",
    ],
    verdict:
      "This profile has already won the hard part: people believe you on sight. Say what you do in the first six words and it stops being admired and starts being followed.",
  },
  {
    id: "underFramed",
    createdAt: "",
    overall: 69,
    archetype: "Substantial, under-framed",
    headline:
      "There is real work here, but the top of the profile makes a stranger do the work of finding it.",
    attentionSeconds: 1.8,
    percentile: 63,
    metrics: [
      {
        key: "firstImpression",
        label: "First Impression",
        score: 63,
        reading:
          "Attention enters at the grid rather than at you, so the first thing judged is your weakest asset.",
        whyItMatters:
          "Whatever the eye hits first sets the expectation for everything below it.",
        whatLowersIt:
          "The profile photo is a logo mark, which reads as a brand account rather than a person.",
        howToImprove:
          "Swap the logo for a tight portrait — face filling most of the circle.",
      },
      {
        key: "trust",
        label: "Trust",
        score: 76,
        reading: "Nothing feels staged or borrowed. Trust is quietly intact.",
        whyItMatters:
          "Without trust, expertise reads as marketing and gets discounted.",
        whatLowersIt: "A link chain in the bio adds friction and reads spammy.",
        howToImprove: "Keep one link. Delete the arrows and the emoji around it.",
      },
      {
        key: "authority",
        label: "Authority",
        score: 84,
        reading:
          "Your captions read like someone who has actually done the work. This is your real advantage.",
        whyItMatters:
          "Authority is why people trust your recommendation over someone with more followers.",
        whatLowersIt:
          "None of that expertise appears before the third scroll — the top screen claims nothing.",
        howToImprove:
          "Promote your sharpest caption sentence into the bio, word for word.",
      },
      {
        key: "visualQuality",
        label: "Visual Quality",
        score: 58,
        reading:
          "Warm and cool tiles fight each other, which reads as inconsistent effort rather than range.",
        whyItMatters:
          "Mixed white balance is the fastest way for good work to look amateur at thumbnail size.",
        whatLowersIt:
          "Four visible tiles are noticeably cooler than the rest of the grid.",
        howToImprove:
          "Pick warm or cool and re-edit the nine visible tiles to match it.",
      },
      {
        key: "profileClarity",
        label: "Profile Clarity",
        score: 71,
        reading:
          "The subject is guessable but never stated, so people arrive at it late or not at all.",
        whyItMatters:
          "People do not follow what they cannot summarise to themselves in one line.",
        whatLowersIt: "The bio opens with a job title instead of a subject.",
        howToImprove:
          "Lead with what you work on, then the title. Subject first, role second.",
      },
      {
        key: "profileConsistency",
        label: "Profile Consistency",
        score: 61,
        reading:
          "Formats change post to post, so nothing accumulates into a recognisable style.",
        whyItMatters:
          "Consistency is what makes a profile memorable without being repetitive.",
        whatLowersIt:
          "Three different caption structures and two aspect ratios in the visible grid.",
        howToImprove:
          "Commit to one aspect ratio and one caption opening for your next nine posts.",
      },
      {
        key: "memorability",
        label: "Memorability",
        score: 62,
        reading:
          "Individually strong frames that do not add up to an image of you.",
        whyItMatters:
          "Recall is what brings people back to an account they did not follow the first time.",
        whatLowersIt: "No colour, framing or subject repeats often enough to register.",
        howToImprove:
          "Choose one repeating element — a backdrop, a colour, a hand in frame — and use it deliberately.",
      },
      {
        key: "socialPresence",
        label: "Social Presence",
        score: 72,
        reading:
          "Posting is steady and the ratio is believable. Nothing here looks bought.",
        whyItMatters:
          "Presence signals whether following you will actually be worth it going forward.",
        whatLowersIt: "Highlights are dated and reference a year that has passed.",
        howToImprove: "Archive anything labelled with an old year and rebuild two current ones.",
      },
    ],
    strength: {
      title: "Evidence of genuine depth",
      detail:
        "Your captions carry real expertise, and that is rare — it is why people who make it past the first screen tend to convert well. The asset exists. It is simply buried.",
    },
    risk: {
      title: "The first screen undersells everything below it",
      detail:
        "Photo, name and bio are the only elements most strangers ever evaluate. Right now they set a lower expectation than your work deserves, so the audience you would serve best never scrolls far enough to find out.",
    },
    actions: [
      {
        title: "Put your face in the profile photo",
        detail:
          "A logo at 40px reads as a company, and companies get less benefit of the doubt for individual expertise. Use a tight crop where your face fills most of the circle.",
        effort: "2 min",
        lift: "Trust +13",
      },
      {
        title: "Re-grade the visible grid to one temperature",
        detail:
          "Pick warm or cool, then re-edit the nine tiles above the fold to match. Consistency is read as quality before content is even considered.",
        effort: "20 min",
        lift: "Visual quality +15",
      },
      {
        title: "Move your best sentence into the bio",
        detail:
          "The sharpest line on your profile is currently inside a post caption. It belongs where the decision actually gets made.",
        effort: "3 min",
        lift: "Authority +9",
      },
    ],
    quickWins: [
      "Remove the link chain and the arrows",
      "Reorder so a face lands in the first three tiles",
      "Add one number to the bio",
      "Archive the two lowest-quality tiles",
    ],
    verdict:
      "You are rewarding patience in a place where nobody is patient. Fix the first screen — photo, first line, grid temperature — and the work you have already made finally gets seen.",
  },
  {
    id: "loud",
    createdAt: "",
    overall: 61,
    archetype: "Energetic, hard to place",
    headline:
      "You register instantly and blur just as fast — people feel the energy but cannot name what you are.",
    attentionSeconds: 1.4,
    percentile: 41,
    metrics: [
      {
        key: "firstImpression",
        label: "First Impression",
        score: 70,
        reading:
          "High contrast pulls the eye in fast. Nothing holds it once it arrives.",
        whyItMatters:
          "Getting noticed and being understood are different jobs. You are winning the first and losing the second.",
        whatLowersIt: "Four competing focal points in the first grid row.",
        howToImprove:
          "Replace the busiest tile with a clean portrait so the row has one clear centre.",
      },
      {
        key: "trust",
        label: "Trust",
        score: 52,
        reading:
          "Stacked text and urgent phrasing read as selling rather than sharing.",
        whyItMatters:
          "Low trust caps everything else — people discount claims they did not ask for.",
        whatLowersIt: "All-caps lines and multiple exclamation marks in the bio.",
        howToImprove:
          "Drop everything to sentence case and keep one exclamation mark at most.",
      },
      {
        key: "authority",
        label: "Authority",
        score: 47,
        reading: "Volume is standing in for proof, and strangers can tell.",
        whyItMatters:
          "Authority is the difference between being entertaining and being hired.",
        whatLowersIt: "Three superlatives and no verifiable detail anywhere.",
        howToImprove:
          "Trade one hype line for one specific result — a number, a name, an outcome.",
      },
      {
        key: "visualQuality",
        label: "Visual Quality",
        score: 56,
        reading:
          "Heavy filters flatten detail, and three tiles show visible compression.",
        whyItMatters:
          "At thumbnail size, artefacts read as low effort, and low effort reads as low value.",
        whatLowersIt: "Three re-saved tiles with visible blocking in flat areas.",
        howToImprove: "Re-upload those three from the original files, unfiltered.",
      },
      {
        key: "profileClarity",
        label: "Profile Clarity",
        score: 49,
        reading:
          "After a full read, a stranger still could not say what you do in one sentence.",
        whyItMatters:
          "Clarity is the strongest predictor of whether a visit becomes a follow.",
        whatLowersIt:
          "The bio lists aspirations rather than naming a subject or service.",
        howToImprove:
          "Delete every aspiration. Write one line: what you do, for whom.",
      },
      {
        key: "profileConsistency",
        label: "Profile Consistency",
        score: 55,
        reading:
          "The palette changes every tile, so the grid competes with itself.",
        whyItMatters:
          "An inconsistent grid makes energy look accidental instead of intentional.",
        whatLowersIt: "Six distinct dominant colours across nine visible tiles.",
        howToImprove:
          "Reduce to two colours plus a neutral, and hold that for your next nine posts.",
      },
      {
        key: "memorability",
        label: "Memorability",
        score: 79,
        reading:
          "People will remember the feeling. They will not remember the offer.",
        whyItMatters:
          "Memorability without clarity produces an audience that watches but never buys.",
        whatLowersIt:
          "The thing that sticks is the intensity, and intensity is not ownable.",
        howToImprove:
          "Attach the energy to one repeated subject so recall points at something.",
      },
      {
        key: "socialPresence",
        label: "Social Presence",
        score: 65,
        reading:
          "Very active, but the frequency reads as urgency rather than momentum.",
        whyItMatters:
          "Presence should feel like a reason to follow, not a reason to mute.",
        whatLowersIt: "Multiple posts per day with no variation in format.",
        howToImprove:
          "Post less, and let each post carry one idea instead of one push.",
      },
    ],
    strength: {
      title: "A voice nobody could mistake",
      detail:
        "Personality is the hardest score on this list to move, and you already have it. Every other number here is a framing problem, not a character problem — which is the good kind of problem to have.",
    },
    risk: {
      title: "Nothing establishes why you should be believed",
      detail:
        "There is no proof anywhere on the first screen — no result, no client, no number. Confidence without evidence reads as pressure, and pressure is why people leave a profile they were enjoying.",
    },
    actions: [
      {
        title: "Trade one hype line for one specific proof",
        detail:
          "Pick your loudest bio line and replace it with something checkable: a number, a client, a result, a year. One verifiable detail outperforms three superlatives on first read.",
        effort: "5 min",
        lift: "Authority +16",
      },
      {
        title: "Cut the palette to two colours plus neutral",
        detail:
          "Choose the two colours that already appear most, and re-edit or reorder so the visible grid holds to them. The energy stays; the noise goes.",
        effort: "25 min",
        lift: "Trust +12",
      },
      {
        title: "Re-upload the three compressed tiles",
        detail:
          "Export from the originals at full size with no filter. Visible artefacts undo everything else you are doing well.",
        effort: "10 min",
        lift: "Visual quality +10",
      },
    ],
    quickWins: [
      "Drop all-caps lines to sentence case",
      "Keep one exclamation mark, at most",
      "Replace the busiest tile with a portrait",
      "Turn your best result into a highlight cover",
    ],
    verdict:
      "You have the part most people never get — people notice you. Turn the volume down ten percent, add one piece of proof, and this becomes a profile people trust as quickly as they notice it.",
  },
];
