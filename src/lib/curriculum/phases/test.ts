import type { PhaseSpec } from "@/lib/curriculum/types";

/**
 * 07 TEST — verify it works, and prove it rather than assume it.
 *
 * The phase that separates "it ran on my machine" from "I know what this does".
 * Its argument is that testing is a decision about what must never break, and
 * that a founder who cannot say what must never break has not finished the
 * product decision.
 */
export const test: PhaseSpec = {
  key: "test",
  modules: [
    {
      slug: "deciding-what-must-hold",
      title: "Deciding what must never break",
      summary:
        "Testing starts as a product decision, not a tooling one.",
      lessons: [
        {
          slug: "what-to-test",
          title: "What is actually worth testing",
          summary:
            "Three categories that earn a test, and the large amount of code that does not.",
          type: "concept",
          difficulty: "intermediate",
          minutes: 10,
          completion: "read",
          skills: ["testing", "critical-thinking"],
          objectives: [
            "Name the three kinds of code that justify a test",
            "Say why chasing coverage is the wrong target for a first product",
          ],
          blocks: [
            {
              id: "t1",
              kind: "text",
              text: "You could write tests for everything, and for a first product you should not. Tests cost time to write and time to maintain, and a suite that tests trivia while missing the important thing is worse than a small suite, because it produces confidence you have not earned.",
            },
            {
              id: "s1",
              kind: "steps",
              title: "Three things that earn a test",
              items: [
                "Rules with money or trust attached. Anything that decides what somebody is charged, what they may see, or what is irreversible.",
                "Logic that is easy to get subtly wrong. Date handling, matching, rounding, ordering, anything with a boundary condition.",
                "Anything that has broken before. A bug that happened once is a bug that can happen again, and the test is how you say it may not.",
              ],
            },
            {
              id: "cal1",
              kind: "callout",
              tone: "why",
              title: "Coverage is the wrong target",
              text: "A high coverage number mostly proves that lines ran, not that behaviour is correct. Ten tests on the three things above are worth more than two hundred that assert a component renders. Ask what would be embarrassing if it broke in front of a user, and start there.",
            },
            {
              id: "t2",
              kind: "text",
              text: "For most first products the highest-value test is not a unit test at all. It is one automated run through the main path — open the app, do the thing, check the result — because that catches the class of failure that actually reaches users: something in the chain stopped working.",
            },
            {
              id: "t3",
              kind: "text",
              text: "There is one more category worth naming: your access rules. A test that signs in as one user and tries to read another's data is the single highest-value test in a multi-user product, because that failure is silent, total and reputational.",
            },
            {
              id: "d1",
              kind: "decision",
              situation:
                "You have a day for testing before showing the product to your first users.",
              options: [
                {
                  id: "a",
                  label: "Unit tests for the matching logic",
                  tradeoff:
                    "Catches the subtle wrongness in the part most likely to be subtly wrong, and runs in a second. Will not catch a broken deployment or a missing environment variable.",
                },
                {
                  id: "b",
                  label: "One automated run through the whole path",
                  tradeoff:
                    "Catches the failures that actually reach users, including integration and configuration. Slower to write, slower to run, and vaguer when it fails.",
                },
                {
                  id: "c",
                  label: "Both, smaller",
                  tradeoff:
                    "A handful of unit tests on the risky logic plus one path test. Less thorough on each, and covers both failure modes.",
                },
                {
                  id: "d",
                  label: "I am not sure which of my code is risky",
                  tradeoff:
                    "Then that is the first thing to establish, and it takes ten minutes: list what would be embarrassing if it broke in front of a user. Whatever is on that list is what earns a test.",
                },
              ],
              recommended: "c",
              explanation:
                "The two catch different things and a day is enough for a thin version of each. If genuinely forced to pick one, take B: a product that is broken end to end is worse than one whose matching is slightly off, and B is the one that notices a bad deployment.",
            },
          ],
        },
        {
          slug: "testing-with-ai",
          title: "Getting tests written without getting fooled",
          summary:
            "The specific trap of asking a model for tests, and how to avoid it.",
          type: "workshop",
          difficulty: "advanced",
          minutes: 11,
          completion: "knowledge_check",
          skills: ["testing", "ai-workflow", "claude-code"],
          requires: ["what-to-test"],
          objectives: [
            "Ask for tests in a way that does not encode the same misunderstanding twice",
            "Prove that a test can fail",
          ],
          blocks: [
            {
              id: "t1",
              kind: "text",
              text: "Asking an execution layer to write tests for code it just wrote has an obvious problem: if it misunderstood the requirement, the tests will assert the misunderstanding. They will pass, and the passing means nothing.",
            },
            {
              id: "t2",
              kind: "text",
              text: "The fix is to describe the behaviour rather than the code. Give the rules in your own words — from your product brief, not from the implementation — and ask for tests of those rules. If the tests then fail against the existing code, you have found a real disagreement, and one of the two is wrong.",
            },
            {
              id: "cal1",
              kind: "callout",
              tone: "warning",
              title: "A test you have never seen fail proves nothing",
              text: "This is the most important habit in this lesson. After a test passes, break the code deliberately — invert a condition, return the wrong value — and confirm the test goes red. Then put it back. A surprising number of tests assert something that is true regardless of the code, and you cannot tell by reading them.",
            },
            {
              id: "s1",
              kind: "steps",
              title: "The loop that works",
              items: [
                "Write the rule in plain language, from the brief.",
                "Ask for tests of that rule, explicitly including the boundary and failure cases.",
                "Run them. If they all pass first time, be suspicious rather than pleased.",
                "Break the code on purpose and confirm the relevant test fails.",
                "Restore the code, run again, commit.",
              ],
            },
            {
              id: "t3",
              kind: "text",
              text: "Ask for the failure cases by name, because they are what gets omitted. Empty input, one item, duplicates, an item that appears twice with different values, a date at a month boundary, a negative number where only positives were imagined.",
            },
            {
              id: "q1",
              kind: "choice",
              question: "Your new test suite passes on the first run. What is the correct response?",
              multiple: false,
              options: [
                { id: "a", label: "Commit — the code is correct" },
                { id: "b", label: "Break the code deliberately and check that the tests notice" },
                { id: "c", label: "Add more tests until one fails" },
                { id: "d", label: "Increase the coverage threshold" },
              ],
              correct: ["b"],
              explanation:
                "A suite that has never been seen to fail might be asserting nothing. Deliberately breaking the code is a thirty-second check that converts \"the tests pass\" into \"the tests would notice\", and it catches tautological assertions that read perfectly well.",
            },
            {
              id: "ex1",
              kind: "expandable",
              summary: "How this platform proved its own security tests were real",
              text: "LOCK's database suite includes tests asserting that a learner cannot write columns they should not be able to write. Each one was verified by restoring the original defect — putting the over-broad permission back — and confirming the test failed. Without that step the suite would have proved only that the current code does what it currently does.",
            },
          ],
        },
        {
          slug: "testing-on-real-devices",
          title: "Testing what a user actually holds",
          summary:
            "The failures that only appear on a real phone, and the fastest way to find them.",
          type: "workshop",
          difficulty: "intermediate",
          minutes: 9,
          completion: "read",
          skills: ["testing", "frontend"],
          requires: ["testing-with-ai"],
          objectives: [
            "Run a structured pass across widths, themes and input methods",
            "Name the failures that a desktop browser will not show you",
          ],
          blocks: [
            {
              id: "t1",
              kind: "text",
              text: "A product that is correct and unusable on a phone is not finished. These failures do not appear in unit tests and mostly do not appear when you drag a desktop window narrow.",
            },
            {
              id: "s1",
              kind: "steps",
              title: "The pass, in fifteen minutes",
              items: [
                "Every main screen at 390 and at 430 wide, scrolled all the way to the bottom.",
                "The same screens in dark mode, if you support it — and if you do not, check that you have not accidentally half-supported it.",
                "Every form with the on-screen keyboard open. Keyboards cover the submit button surprisingly often.",
                "Every control by keyboard alone: tab to it, activate it, and confirm you can see where you are.",
                "One slow-network run. Throttle to a slow connection and watch what the product looks like while it waits.",
              ],
            },
            {
              id: "cal1",
              kind: "callout",
              tone: "tip",
              title: "Automate the boring half",
              text: "A browser automation tool can load every screen at every width in both themes and report horizontal overflow, console errors and missing labels. That is a script you write once and run for the rest of the product's life. LOCK's own sweep covers thirty-two routes at eleven widths in two themes, and it has caught real regressions that reading the code did not.",
            },
            {
              id: "t2",
              kind: "text",
              text: "Two things to check that people consistently miss. Horizontal scrolling on the whole document — usually one wide table or a long unbroken string. And anything fixed to the bottom of the screen sitting on top of the last piece of content, which only shows up if you actually scroll to the end.",
            },
          ],
        },
      ],
      mission: {
        slug: "test-report",
        title: "Prove it works",
        summary:
          "Tests on the parts that matter, a device pass, and an honest list of what is still broken.",
        type: "test",
        difficulty: "intermediate",
        minutes: 240,
        objective:
          "Write tests for the rules that must hold, run a structured device pass, and record what is genuinely still wrong.",
        whyItMatters:
          "Before real people use it, you should be able to say what you know works rather than what you hope works. The list of known problems matters as much as the tests: shipping with a known issue is a decision, shipping with an unknown one is an accident.",
        objectives: [
          "Tests covering the risky logic and the access rules",
          "Every test seen to fail once, deliberately",
          "A device and accessibility pass, with results",
          "A written list of known issues you are choosing to ship with",
        ],
        blocks: [
          {
            id: "m1",
            kind: "steps",
            title: "How to work through it",
            items: [
              "List the rules that must hold, in plain language, from your brief.",
              "Write tests for them. Include boundary and failure cases explicitly.",
              "Break each piece of code deliberately and confirm the test notices. Restore.",
              "Run the device pass at 390 and 430, in both themes, with the keyboard.",
              "Write the known-issues list. Be honest; nobody is grading it.",
            ],
          },
          {
            id: "m2",
            kind: "callout",
            tone: "real_world",
            title: "The two-account test belongs here too",
            text: "If your product has accounts, the access test is the most valuable one in the suite. Automate it: sign in as one user, attempt to read another's record, assert nothing comes back. Then it runs forever, including after a change you did not think touched permissions.",
          },
          {
            id: "m3",
            kind: "checklist",
            title: "Before you submit",
            items: [
              "Every test has been seen to fail at least once",
              "The access rules are covered by an automated test",
              "The device pass was done at real widths, scrolled to the bottom",
              "Known issues are written down rather than remembered",
            ],
          },
        ],
        deliverableTitle: "Test Report",
        deliverableDescription:
          "What you tested, how you proved the tests can fail, the device pass results, and the issues you are shipping with knowingly.",
        requiredEvidence: ["repository", "document"],
        requiresLesson: "testing-on-real-devices",
        skills: [
          { key: "testing", primary: true },
          { key: "debugging" },
        ],
        toolbox: ["ship-checklist"],
      },
    },
  ],
};
