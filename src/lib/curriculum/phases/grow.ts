import type { PhaseSpec } from "@/lib/curriculum/types";

/**
 * 10 GROW — find the channel that works, and run it.
 *
 * The final phase, and the one that has to hand the learner back to themselves.
 * It teaches a loop rather than a set of tactics, because tactics expire and
 * the loop is what they will use on the product after this one.
 */
export const grow: PhaseSpec = {
  key: "grow",
  modules: [
    {
      slug: "measuring-what-matters",
      title: "Measuring what matters",
      summary:
        "The three numbers that mean something for a small product, and the many that do not.",
      lessons: [
        {
          slug: "three-numbers",
          title: "Three numbers, and the ones to ignore",
          summary:
            "Activation, retention and one channel number — and why traffic is not on the list.",
          type: "concept",
          difficulty: "intermediate",
          minutes: 9,
          completion: "read",
          skills: ["analytics", "growth"],
          objectives: [
            "Define activation for your own product",
            "Say why retention is the number that decides whether growth is possible",
          ],
          blocks: [
            {
              id: "t1",
              kind: "text",
              text: "Analytics tools will offer you forty numbers. Three of them matter at this size, and the rest are a way to feel busy.",
            },
            {
              id: "h1",
              kind: "heading",
              level: 2,
              text: "Activation",
            },
            {
              id: "t2",
              kind: "text",
              text: "The proportion of people who arrive and reach the moment where the product actually does its job. For the rent example: uploaded a statement and saw a result. Not signed up — signed up is a form completion, and a form completion is not value.",
            },
            {
              id: "t3",
              kind: "text",
              text: "Define this precisely for your product, as a single event, before you measure anything else. It is the number that tells you whether the problem is your product or your traffic.",
            },
            {
              id: "h2",
              kind: "heading",
              level: 2,
              text: "Retention",
            },
            {
              id: "t4",
              kind: "text",
              text: "Of the people who activated, how many came back and did it again in the next natural period. For a monthly job, next month. This is the number that decides whether anything else is worth doing.",
            },
            {
              id: "cal1",
              kind: "callout",
              tone: "why",
              title: "Why retention comes before acquisition",
              text: "Pouring people into a product they do not return to converts attention into nothing, and burns the channel while it does. If retention is near zero, more traffic is not a growth plan, it is a faster way to run out of people who have not already dismissed you.",
            },
            {
              id: "h3",
              kind: "heading",
              level: 2,
              text: "One channel number",
            },
            {
              id: "t5",
              kind: "text",
              text: "Whatever the single channel you are running produces. Replies to messages sent, sign-ups from a forum post, conversions from a page. One channel, one number, changed deliberately.",
            },
            {
              id: "t6",
              kind: "text",
              text: "Ignore, for now: page views, total sign-ups, time on page, social followers, anything that goes up on its own and never goes down. They are pleasant and they do not distinguish between a product that works and one that does not.",
            },
            {
              id: "q1",
              kind: "choice",
              question:
                "Two hundred people visited, thirty signed up, and two came back the following month. Where is the problem?",
              multiple: false,
              options: [
                { id: "a", label: "Traffic — you need more visitors" },
                { id: "b", label: "Retention, and possibly activation. More traffic would waste more people" },
                { id: "c", label: "The sign-up form" },
                { id: "d", label: "Pricing" },
              ],
              correct: ["b"],
              explanation:
                "Thirty of two hundred signing up is unremarkable but survivable. Two of thirty returning is the finding: either they never reached the value, or the value was not worth returning for. Both are product questions, and adding traffic before answering them spends your audience to learn nothing.",
            },
          ],
        },
        {
          slug: "instrumenting-honestly",
          title: "Instrumenting without drowning",
          summary:
            "What to record, what not to, and what you owe the people you are recording.",
          type: "build",
          difficulty: "intermediate",
          minutes: 9,
          completion: "read",
          skills: ["analytics", "backend"],
          requires: ["three-numbers"],
          objectives: [
            "Instrument the three numbers with a handful of events",
            "Decide what personal data you are not going to collect",
          ],
          blocks: [
            {
              id: "t1",
              kind: "text",
              text: "You need perhaps four events, not forty. Arrived, activated, returned, and whatever your channel action is. Name them for what happened rather than for where they were fired.",
            },
            {
              id: "code1",
              kind: "code",
              language: "text",
              filename: "events.txt",
              code: "statement_uploaded      the input arrived\nresult_viewed           the moment of value  ← activation\nreturned_next_month     retention\nreferral_link_opened    the one channel number",
            },
            {
              id: "t2",
              kind: "text",
              text: "Instrument the outcome, not the click. \"Button clicked\" tells you somebody tried; \"result viewed\" tells you it worked. When the two diverge you have found a bug that no error report would have shown you, because nothing threw.",
            },
            {
              id: "cal1",
              kind: "callout",
              tone: "warning",
              title: "Collect less than you are allowed to",
              text: "Analytics tools make it trivial to record everything a user does, including things you have no use for and would rather not hold. Decide deliberately what you collect, avoid personal data you do not need, and be able to say plainly what you store and why. This is both a legal question in most jurisdictions and a straightforward matter of not holding what you cannot protect.",
            },
            {
              id: "t3",
              kind: "text",
              text: "At this size a small privacy-respecting analytics tool plus your own database will answer everything you need. Your database already knows who did what and when; a lot of early product analytics is a query you could write.",
            },
          ],
        },
      ],
      mission: {
        slug: "metrics-baseline",
        title: "Measure where you actually are",
        summary:
          "Activation, retention and one channel number, instrumented and recorded as a starting point.",
        type: "growth",
        difficulty: "intermediate",
        minutes: 150,
        objective:
          "Define and instrument your three numbers, then record the current values as the baseline everything after this is compared against.",
        whyItMatters:
          "Without a baseline, every later change is an opinion about whether things improved. With one, the loop in the next module has something to run against.",
        objectives: [
          "Activation defined as a single precise event",
          "The three numbers instrumented and recorded",
          "A written statement of what you collect and what you deliberately do not",
        ],
        blocks: [
          {
            id: "m1",
            kind: "steps",
            title: "How to work through it",
            items: [
              "Write your activation event as one sentence. It must be the moment of value, not a sign-up.",
              "Instrument four events at most.",
              "Record today's numbers, however small and however embarrassing.",
              "Write down what personal data you collect and what you have chosen not to.",
            ],
          },
          {
            id: "m2",
            kind: "checklist",
            title: "Before you submit",
            items: [
              "Activation is a single event and it is the moment of value",
              "The baseline numbers are real, including if one of them is zero",
              "You have four events or fewer",
              "Your data statement says what you do not collect, not only what you do",
            ],
          },
        ],
        deliverableTitle: "Metrics Baseline",
        deliverableDescription:
          "The three numbers defined, instrumented and recorded, with your data-collection decisions.",
        requiredEvidence: ["document", "repository"],
        requiresLesson: "instrumenting-honestly",
        skills: [
          { key: "analytics", primary: true },
          { key: "growth" },
        ],
      },
    },

    {
      slug: "one-channel-at-a-time",
      title: "One channel, and the loop after it",
      summary:
        "How distribution actually works at this size, and the habit that continues after LOCK.",
      lessons: [
        {
          slug: "choosing-one-channel",
          title: "Choosing one channel",
          summary:
            "Why doing one thing badly beats doing five things briefly.",
          type: "concept",
          difficulty: "intermediate",
          minutes: 10,
          completion: "knowledge_check",
          skills: ["growth"],
          requires: ["three-numbers"],
          objectives: [
            "Pick a channel from where your users already are",
            "Say why running several channels at once produces no information",
          ],
          blocks: [
            {
              id: "t1",
              kind: "text",
              text: "The instinct is to try everything: posts, a newsletter, a directory listing, some ads, a video. Five channels run for a fortnight each produce five ambiguous results and one exhausted founder.",
            },
            {
              id: "t2",
              kind: "text",
              text: "Every channel takes time to work and time to learn. Doing one for two months tells you whether it works. Doing five for two weeks tells you nothing, because none of them had long enough and you cannot attribute what did happen.",
            },
            {
              id: "h1",
              kind: "heading",
              level: 2,
              text: "Choose from where they already are",
            },
            {
              id: "t3",
              kind: "text",
              text: "Your research told you where these people gather. That is the shortlist, and the fact that you already found five of them there is evidence the channel exists.",
            },
            {
              id: "tab1",
              kind: "table",
              columns: ["Channel", "Suits", "The real cost"],
              rows: [
                ["Direct outreach", "A narrow, identifiable audience", "It does not scale, and it works immediately — which is why it is the right first one"],
                ["Being useful in a community", "Anywhere the audience already gathers", "Months of participation before it returns anything, and it fails if it reads as marketing"],
                ["Writing about the problem", "Problems people search for", "Slow, compounding, and worthless if the problem is not searched for"],
                ["Partnering with an adjacent tool", "A clear complement", "Depends on somebody else's priorities"],
                ["Paid acquisition", "A proven funnel and known value per customer", "Buys you nothing before you know your numbers"],
              ],
            },
            {
              id: "cal1",
              kind: "callout",
              tone: "why",
              title: "Start with the one that does not scale",
              text: "Talking to people one at a time is the fastest way to your first ten users, and it is the only channel that also teaches you what to say. The words that work in a message are the words that go on the landing page — and you cannot know them until you have watched a few land badly.",
            },
            {
              id: "q1",
              kind: "choice",
              question: "Why run one channel for two months rather than five for two weeks?",
              multiple: false,
              options: [
                { id: "a", label: "It is less work" },
                { id: "b", label: "Channels take time to work, and a short run of several produces results you cannot attribute or learn from" },
                { id: "c", label: "Because the others do not work" },
                { id: "d", label: "To keep the budget down" },
              ],
              correct: ["b"],
              explanation:
                "Time and attribution. Most channels have a delay before they return anything, and running several at once means any result cannot be traced to a cause. One channel, long enough, produces a fact — including the fact that it does not work, which is also useful.",
            },
          ],
        },
        {
          slug: "the-loop-after-lock",
          title: "The loop you keep after this",
          summary:
            "Observe, hypothesise, change one thing, measure, decide — and how to know when to stop.",
          type: "concept",
          difficulty: "advanced",
          minutes: 10,
          completion: "read",
          skills: ["growth", "product-iteration", "critical-thinking"],
          requires: ["choosing-one-channel"],
          objectives: [
            "Run one iteration cycle end to end",
            "Say what you would do next on a product with no programme attached to it",
          ],
          blocks: [
            {
              id: "t1",
              kind: "text",
              text: "Everything in the last nine phases collapses into one loop, and this loop is what you take to the next product, where there will be no lessons and no missions.",
            },
            {
              id: "s1",
              kind: "steps",
              title: "The loop",
              items: [
                "Observe. Look at the numbers and, more importantly, watch somebody use it. The number tells you what; a person tells you why.",
                "Hypothesise. Write one sentence that could be false: \"people do not return because they forget it is the 1st\".",
                "Change one thing. One, so the result means something.",
                "Measure. Against the baseline, over a period long enough to be real.",
                "Decide. Keep it, revert it, or run it longer — and write down which and why.",
              ],
            },
            {
              id: "cal1",
              kind: "callout",
              tone: "why",
              title: "One thing at a time is the whole discipline",
              text: "Changing three things and seeing an improvement teaches you nothing about which one caused it, and you will keep all three forever. This is the same rule as the debugging lesson in Phase 06 and the pass-mark rule in Phase 03. It is the same idea wearing different clothes each time: make it possible to be wrong about one specific thing.",
            },
            {
              id: "h1",
              kind: "heading",
              level: 2,
              text: "Knowing when to stop",
            },
            {
              id: "t2",
              kind: "text",
              text: "Some products should be stopped, and being able to make that call is a skill rather than a failure. If activation is reasonable and retention is near zero after several honest attempts to fix it, people do not want it enough. That is not a marketing problem.",
            },
            {
              id: "t3",
              kind: "text",
              text: "Stopping is cheap now in a way it will not be later, and you leave with the thing that was actually worth acquiring: you can find a problem, get evidence, scope a product, direct an execution layer, verify what it produces, ship it and charge for it. That capability does not belong to this product.",
            },
            {
              id: "h2",
              kind: "heading",
              level: 2,
              text: "What finishing LOCK means",
            },
            {
              id: "t4",
              kind: "text",
              text: "Not that you have completed every lesson. It means you have a product in production that somebody other than you has used, a record of the decisions that got it there, and a loop you can run again without being told to.",
            },
            {
              id: "t5",
              kind: "text",
              text: "The test is simple and you will meet it soon enough. The next time an idea arrives, the question \"what should I do first?\" should have an obvious answer — and it should not involve opening this platform.",
            },
            {
              id: "r1",
              kind: "reflection",
              prompt:
                "What is the first thing you would do if a completely new idea arrived tomorrow? Write the first three steps. Optional, and there is no right answer — but if you can write them without looking anything up, LOCK has done its job.",
            },
          ],
        },
      ],
      mission: {
        slug: "growth-experiment",
        title: "Run one experiment properly",
        summary:
          "One channel, one hypothesis, one change, and an honest reading of what happened.",
        type: "growth",
        difficulty: "advanced",
        minutes: 240,
        objective:
          "Pick one channel, run one falsifiable experiment against your baseline, and decide what it means.",
        whyItMatters:
          "This is the loop you will use for the rest of the product's life, and on every product after it. Running it once, properly, with a written hypothesis and a real decision, is what turns it into a habit rather than a diagram.",
        objectives: [
          "One channel chosen, with the reason",
          "One hypothesis written as a sentence that could be false",
          "One change, measured against the baseline, with a decision recorded",
        ],
        blocks: [
          {
            id: "m1",
            kind: "steps",
            title: "How to work through it",
            items: [
              "Pick one channel from where your research says these people already are.",
              "Write the hypothesis as a falsifiable sentence, and the number that would confirm or deny it.",
              "Change one thing. Run it for long enough to mean something — for most channels that is at least two weeks.",
              "Measure against your Phase 10 baseline.",
              "Write the decision: keep, revert, or run longer — and the reason.",
            ],
          },
          {
            id: "m2",
            kind: "callout",
            tone: "real_world",
            title: "A negative result is a result",
            text: "\"I sent forty personal messages and got two replies and no sign-ups\" is a finding about the channel, the message or the audience — and it costs a fortnight rather than six months. Record it as plainly as you would record a success.",
          },
          {
            id: "m3",
            kind: "checklist",
            title: "Before you submit",
            items: [
              "Exactly one thing changed",
              "The hypothesis was written before the experiment ran",
              "The result is compared against the recorded baseline",
              "The decision is written down with its reason",
            ],
          },
        ],
        deliverableTitle: "Growth Experiment",
        deliverableDescription:
          "The channel, the hypothesis, the change, the measured result and the decision you made.",
        requiredEvidence: ["document"],
        requiresReflection: true,
        requiresLesson: "the-loop-after-lock",
        skills: [
          { key: "growth", primary: true },
          { key: "analytics" },
          { key: "product-iteration" },
        ],
      },
    },
  ],
};
