import type { PhaseSpec } from "@/lib/curriculum/types";

/**
 * 03 VALIDATE — get evidence before you get a codebase.
 *
 * The phase exists to answer one question honestly: is there enough here to
 * justify the next two months? It teaches a ladder of evidence, a cheap test,
 * and — the part most programmes leave out — how to decide you were wrong.
 */
export const validate: PhaseSpec = {
  key: "validate",
  modules: [
    {
      slug: "what-counts-as-evidence",
      title: "What actually counts as evidence",
      summary:
        "A ladder from opinion to money, and where your current evidence really sits.",
      lessons: [
        {
          slug: "evidence-ladder",
          title: "The evidence ladder",
          summary:
            "Six rungs from 'they said it sounds good' to 'they paid', and what each one is worth.",
          type: "concept",
          difficulty: "intermediate",
          minutes: 10,
          completion: "knowledge_check",
          skills: ["validation", "critical-thinking"],
          toolbox: ["evidence-quality-ladder"],
          objectives: [
            "Place a piece of evidence on the ladder",
            "Name the cheapest rung above your current evidence",
          ],
          blocks: [
            {
              id: "t1",
              kind: "text",
              text: "Founders say \"validated\" about wildly different things. The word is doing no work unless you say what happened. This ladder puts an order on it, and the ordering principle is simple: the more the person gave up, the more the signal is worth.",
            },
            {
              id: "tab1",
              kind: "table",
              columns: ["Rung", "What happened", "What it costs them", "What it proves"],
              rows: [
                ["1", "They said it sounds useful", "Nothing", "Nothing"],
                ["2", "They described a real past instance of the problem", "A minute of honesty", "The problem exists"],
                ["3", "They showed you their workaround", "Mild embarrassment", "It is worth effort to them"],
                ["4", "They gave you their email for a thing that does not exist", "A small commitment", "Interest, weakly"],
                ["5", "They did something manual that took real time — filled the form, sent the file, ran the process with you", "Their time", "Motivation"],
                ["6", "They paid, or signed something, or gave you their data", "Money or risk", "Demand"],
              ],
            },
            {
              id: "cal1",
              kind: "callout",
              tone: "why",
              title: "The gap that matters",
              text: "Everything up to rung 3 tells you the problem is real. Only rungs 5 and 6 tell you that yours is the answer they will actually adopt. Most first products are built on rungs 1 to 3 and are surprised later.",
            },
            {
              id: "t2",
              kind: "text",
              text: "Rung 4 deserves a warning. An email address is nearly free to give and is the standard output of a landing-page test — which is why a long list of sign-ups so often converts to almost nothing. It is a real signal, but a weak one, and it is frequently mistaken for a strong one.",
            },
            {
              id: "t3",
              kind: "text",
              text: "The practical move is never \"get to rung 6 immediately\". It is: find the cheapest test that gets you one rung higher than where you are. If you are on 3, do not build a product to reach 6 — find a way to reach 5 by hand, this week.",
            },
            {
              id: "q1",
              kind: "choice",
              question:
                "Forty people signed up to your waiting list. Two of them sent you their actual bank statement so you could run the process manually. Which is the stronger evidence?",
              multiple: false,
              options: [
                { id: "a", label: "The forty sign-ups, because volume matters" },
                { id: "b", label: "The two statements, because sending real data is rung 5 and a sign-up is rung 4" },
                { id: "c", label: "They are equivalent" },
                { id: "d", label: "Neither counts until somebody pays" },
              ],
              correct: ["b"],
              explanation:
                "Two people who handed over real financial data did something costly and slightly risky. Forty people typed an email address. Volume at a low rung is not the same as depth at a high one — and the two are the people you should build for.",
            },
            {
              id: "r1",
              kind: "reflection",
              prompt:
                "Where does your evidence actually sit right now, and what is the cheapest thing that would move it one rung? Optional, and not graded — but the answer is your plan for the next lesson.",
            },
          ],
        },
        {
          slug: "designing-a-cheap-test",
          title: "Designing a test that could fail",
          summary:
            "A falsifiable test, a number decided in advance, and no code.",
          type: "workshop",
          difficulty: "intermediate",
          minutes: 11,
          completion: "read",
          skills: ["validation", "critical-thinking"],
          requires: ["evidence-ladder"],
          objectives: [
            "Design a test with a pass mark set before it runs",
            "Choose a test that costs days rather than weeks",
          ],
          blocks: [
            {
              id: "t1",
              kind: "text",
              text: "A test that cannot fail is not a test. If every possible outcome would leave you saying \"good, let us keep going\", you have designed a ritual. Set the number first, in writing, before you run it.",
            },
            {
              id: "h1",
              kind: "heading",
              level: 2,
              text: "Four tests, cheapest first",
            },
            {
              id: "s1",
              kind: "steps",
              title: "Pick the cheapest one that moves you up a rung",
              items: [
                "The manual service. Do the job by hand for three people. Slow, unscalable, and by far the most informative thing on this list.",
                "The one-page offer. A page describing precisely what it does and for whom, with one action. Not a product — an offer.",
                "The pre-order or deposit. Ask for money before the thing exists. Brutal, fast, and unambiguous.",
                "The concierge prototype. A shell they can use, with you doing the work behind it. Best when the workflow itself is what you need to learn.",
              ],
            },
            {
              id: "cal1",
              kind: "callout",
              tone: "tip",
              title: "The manual service is underrated",
              text: "Doing the job by hand for three people teaches you the edge cases, the real sequence, and the words they use — all of which you would otherwise discover in Phase 06 as bugs. It also produces rung-5 evidence, and it takes a day.",
            },
            {
              id: "h2",
              kind: "heading",
              level: 2,
              text: "Set the number first",
            },
            {
              id: "t2",
              kind: "text",
              text: "Write the sentence before you start: \"If fewer than N of the M people I ask do X, I will stop and reconsider.\" Then commit to it. The purpose of the number is to make it hard to reinterpret a bad result as a learning opportunity.",
            },
            {
              id: "c1",
              kind: "comparison",
              title: "Two versions of the same test",
              left: {
                label: "Cannot fail",
                points: [
                  "I'll put up a landing page and see what happens",
                  "No number, no deadline",
                  "Any result can be read as encouraging",
                  "Ends with 'we should try a different headline'",
                ],
              },
              right: {
                label: "Can fail",
                points: [
                  "I will ask 20 landlords from two forums to send me last month's statement so I can return a missing-rent list within a day",
                  "If fewer than 4 send a statement within a week, the problem is not urgent enough and I stop",
                  "Deadline and pass mark fixed in advance",
                  "Both outcomes change what I do next",
                ],
              },
            },
            {
              id: "d1",
              kind: "decision",
              situation:
                "You have one week. You could build a landing page with a waiting list, or offer to do the job by hand for five people you already interviewed.",
              options: [
                {
                  id: "a",
                  label: "Landing page and waiting list",
                  tradeoff:
                    "Reaches more people and is easy to share. Produces rung-4 evidence, tests your headline as much as your idea, and tells you almost nothing about the workflow.",
                },
                {
                  id: "b",
                  label: "Do it by hand for five people",
                  tradeoff:
                    "Only five people, and it does not scale. Produces rung-5 evidence, teaches you the real sequence and the edge cases, and every one of the five is a candidate first user.",
                },
                {
                  id: "c",
                  label: "I am not sure yet",
                  tradeoff:
                    "Ask which unknown is bigger. If you doubt people want it, the page is cheaper. If you doubt you can actually deliver it, only doing it will tell you.",
                },
              ],
              recommended: "b",
              explanation:
                "For a first product, doing it by hand is usually the better week. It produces stronger evidence and it also does the job of the next phase — you will finish knowing the workflow well enough to scope it. The landing page becomes worth more once you know what sentence to put on it, which is after this.",
            },
          ],
        },
        {
          slug: "deciding-you-were-wrong",
          title: "Deciding you were wrong",
          summary:
            "How to read a weak result, and the three honest responses to it.",
          type: "concept",
          difficulty: "intermediate",
          minutes: 8,
          completion: "read",
          skills: ["validation", "critical-thinking"],
          requires: ["designing-a-cheap-test"],
          objectives: [
            "Distinguish a failed test from a failed idea",
            "Choose between narrowing, changing the person, and stopping",
          ],
          blocks: [
            {
              id: "t1",
              kind: "text",
              text: "Most validation phases end ambiguously: some interest, nobody desperate, a result that is neither a yes nor a clean no. That is the hardest outcome to handle honestly, and the temptation is always to keep going because stopping feels like failure.",
            },
            {
              id: "t2",
              kind: "text",
              text: "Separate two questions that get merged. Did the test fail, or did the idea fail? A test fails when you asked the wrong people, asked badly, or asked for something too large. An idea fails when the right people, asked well, still did not act.",
            },
            {
              id: "s1",
              kind: "steps",
              title: "Three honest responses to a weak result",
              items: [
                "Narrow. The problem may be real for a smaller group with a sharper version of it. Landlords with five flats and a mortgage, not landlords in general.",
                "Change the person. The same problem often hurts somebody else far more — often the person who gets blamed when it goes wrong, rather than the person doing the work.",
                "Stop. Genuinely. Take what you learned about running research and apply it to your second candidate, which you already wrote down in Phase 01.",
              ],
            },
            {
              id: "cal1",
              kind: "callout",
              tone: "real_world",
              title: "Stopping early is a skill, not a defeat",
              text: "Two months spent and abandoned is a cheap education. Two years spent and abandoned is not. The people who build several products get good at this specific decision, and the ones who never make it usually only ever build one thing.",
            },
            {
              id: "t3",
              kind: "text",
              text: "There is a fourth response, and it is the one to be suspicious of: build it anyway and see. Sometimes that is right — when you are building for yourself, or when the build is genuinely a week. Most of the time it is the decision you make because you do not want to make one of the other three.",
            },
            {
              id: "pr1",
              kind: "predict",
              situation:
                "You offered to do the job by hand for twenty people. Two said yes, and both then went quiet when you asked for the file.",
              prompt:
                "What does that most likely mean? Optional — commit to an answer before reading on.",
              reveal:
                "Almost certainly that the problem is real but not urgent, and quite possibly that handing over financial data to a stranger is the actual blocker. Both are useful. The first suggests narrowing to a group with a sharper version. The second is a trust problem you could test separately, and it would have sunk the product in Phase 08 if you had discovered it there instead.",
            },
          ],
        },
      ],
      mission: {
        slug: "run-a-demand-test",
        title: "Run one test that could fail",
        summary:
          "One week, one pass mark set in advance, and an honest reading of the result.",
        type: "research",
        difficulty: "intermediate",
        minutes: 300,
        objective:
          "Design and run a single falsifiable test that moves your evidence up at least one rung, and write down what it means.",
        whyItMatters:
          "This is the last cheap moment. After this phase you start spending weeks rather than days, and everything you build inherits whatever this test did or did not establish.",
        objectives: [
          "A test with a pass mark written before it ran",
          "The actual result, including the uncomfortable parts",
          "A decision: continue, narrow, change the person, or stop",
        ],
        blocks: [
          {
            id: "m1",
            kind: "text",
            text: "One test, not three. Running several at once means you will not know which one told you anything, and it guarantees none of them are done properly.",
          },
          {
            id: "m2",
            kind: "steps",
            title: "How to work through it",
            items: [
              "Write the pass mark first: if fewer than N of M people do X within D days, you stop and reconsider. Put it at the top of the document.",
              "Pick the cheapest test that moves you one rung up the ladder. For most people that is doing the job by hand.",
              "Run it. Do not change the criteria while it is running.",
              "Record what happened, including the people who went quiet — silence is data.",
              "Write your decision and the reasoning, in three sentences.",
            ],
          },
          {
            id: "m3",
            kind: "callout",
            tone: "warning",
            title: "The one thing that invalidates this mission",
            text: "Deciding the pass mark after seeing the result. If you find yourself explaining why the number you chose was too strict, stop and notice that you are doing it. Write the new reasoning down separately so it is visible rather than silent.",
          },
          {
            id: "m4",
            kind: "checklist",
            title: "Before you submit",
            items: [
              "The pass mark is at the top and was written before the test ran",
              "The result is recorded as it happened, not as it was hoped",
              "Silence and non-responses are counted",
              "Your decision is one of: continue, narrow, change the person, stop",
            ],
          },
        ],
        deliverableTitle: "Validation Report",
        deliverableDescription:
          "The test, the pass mark set in advance, what actually happened, and the decision you made.",
        requiredEvidence: ["document"],
        requiresReflection: true,
        requiresLesson: "deciding-you-were-wrong",
        skills: [
          { key: "validation", primary: true },
          { key: "critical-thinking" },
        ],
        toolbox: ["validation-report", "evidence-quality-ladder"],
      },
    },
  ],
};
