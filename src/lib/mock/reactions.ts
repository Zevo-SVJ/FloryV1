export interface Reaction {
  handle: string;
  /** Display name shown only where it adds credibility. */
  name?: string;
  verified?: boolean;
  body: string;
  likes: number;
  /** Relative timestamp, kept vague on purpose. */
  when: string;
  /** Avatar tint index — resolved to a palette in the component. */
  tint: number;
}

/**
 * Reactions, written the way people actually post: uneven lengths, lower-case
 * openings, the occasional emoji, one or two that are barely a sentence. Mixed
 * personalities — a photographer, a founder, someone's sister, a sceptic who
 * came round.
 */
export const REACTIONS: Reaction[] = [
  {
    handle: "@marabuilds",
    body: "didn't expect this to call out my bio 😂 but it was right",
    likes: 1284,
    when: "2d",
    tint: 0,
  },
  {
    handle: "@devinosei",
    name: "Devin Osei",
    verified: true,
    body: "The authority score was painfully accurate. I've been coasting on vibes for two years.",
    likes: 3102,
    when: "1d",
    tint: 1,
  },
  {
    handle: "@studio.halden",
    body: "I changed two things and my profile instantly looked cleaner. Two things!",
    likes: 842,
    when: "5h",
    tint: 2,
  },
  {
    handle: "@yuki.tmr",
    body: "it noticed details i never even thought about. the grid temperature thing broke my brain a little",
    likes: 2471,
    when: "3d",
    tint: 3,
  },
  {
    handle: "@iris.vdm",
    name: "Iris Vandermeer",
    verified: true,
    body: "Way more useful than follower analytics. Analytics tell you what happened. This tells you why.",
    likes: 5219,
    when: "6d",
    tint: 4,
  },
  {
    handle: "@noahkeeps",
    body: "I actually screenshotted the report 🙃",
    likes: 618,
    when: "12h",
    tint: 5,
  },
  {
    handle: "@salt.and.co",
    body: "ran it on our three founders. all three got told the same thing about clarity. humbling morning",
    likes: 1877,
    when: "4d",
    tint: 0,
  },
  {
    handle: "@priyanka.r",
    body: "ok the 1.4 second thing is brutal",
    likes: 954,
    when: "1d",
    tint: 2,
  },
  {
    handle: "@tobiasleroux",
    name: "Tobias Leroux",
    body: "I was ready to hate this. It told me my logo profile picture was costing me trust and it was completely correct.",
    likes: 4408,
    when: "2d",
    tint: 1,
  },
  {
    handle: "@amaralight",
    body: "sent it to my sister who has 40k followers and a terrible bio. she has since fixed the bio",
    likes: 2130,
    when: "8h",
    tint: 3,
  },
  {
    handle: "@junipergoods",
    body: "the part where it tells you what's lowering each score is the whole product honestly",
    likes: 1663,
    when: "3d",
    tint: 4,
  },
  {
    handle: "@casparbeck",
    verified: true,
    body: "Followers went up a third after two edits. Nothing about my work changed.",
    likes: 6034,
    when: "1w",
    tint: 5,
  },
  {
    handle: "@lena.mkr",
    body: "finally something that doesn't just say post more",
    likes: 1092,
    when: "16h",
    tint: 2,
  },
  {
    handle: "@orenfield",
    body: "read my profile faster than my own mother could",
    likes: 3894,
    when: "5d",
    tint: 0,
  },
];
