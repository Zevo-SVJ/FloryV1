import type { PhaseSpec } from "@/lib/curriculum/types";

/**
 * 04 PRODUCT — turn evidence into scope.
 *
 * The bridge phase. Everything before it was learning; everything after it is
 * building. Its job is to convert what the learner now knows into a written
 * decision about what exists in version one and what does not.
 */
export const product: PhaseSpec = {
  key: "product",
  modules: [
    {
      slug: "from-evidence-to-product",
      title: "From evidence to a product",
      summary:
        "Turning what you learned into a defined thing, without inventing requirements along the way.",
      lessons: [
        {
          slug: "jobs-not-features",
          title: "Start from the job, not the screen",
          summary:
            "Describe what the user is trying to get done, and let the interface fall out of it.",
          type: "concept",
          difficulty: "intermediate",
          minutes: 9,
          completion: "read",
          skills: ["product-thinking", "ux-thinking"],
          objectives: [
            "Write the job your product does in one sentence",
            "Derive a screen from a job rather than the other way round",
          ],
          blocks: [
            {
              id: "t1",
              kind: "text",
              text: "The moment you start sketching screens, you start inventing. A screen suggests a field, a field suggests a setting, a setting suggests a settings page, and within an hour you have designed a product nobody described to you.",
            },
            {
              id: "t2",
              kind: "text",
              text: "Work from the job instead. A job is what somebody is trying to accomplish, stated without reference to any software: \"know which rent did not arrive this month, before the fifth\". It has a trigger, a desired outcome and a deadline, and none of those are your decisions.",
            },
            {
              id: "c1",
              kind: "comparison",
              title: "Two ways to define the same product",
              left: {
                label: "Screen-first",
                points: [
                  "A dashboard with the month's summary",
                  "A properties page",
                  "A tenants page",
                  "An upload page",
                  "A settings page",
                  "Six screens, and no idea which one matters",
                ],
              },
              right: {
                label: "Job-first",
                points: [
                  "Job: on the 1st, know what did not arrive",
                  "Trigger: the statement lands in their inbox",
                  "Outcome: a list of names and amounts",
                  "Deadline: before they chase anyone",
                  "Implies: one upload, one list. Everything else is later",
                ],
              },
            },
            {
              id: "cal1",
              kind: "callout",
              tone: "why",
              title: "Why this ordering matters now more than ever",
              text: "You can ask an execution layer for a settings page and have it in ten minutes. That means the constraint that used to stop you building the wrong thing — effort — is gone. Writing the job down first is what replaces it.",
            },
            {
              id: "t3",
              kind: "text",
              text: "Write your job with the trigger and the deadline included. Both come from your interviews, and both will decide things later: the trigger tells you where the product has to meet the user, and the deadline tells you how fast it has to be.",
            },
            {
              id: "q1",
              kind: "choice",
              question: "Which of these is a job rather than a feature?",
              multiple: false,
              options: [
                { id: "a", label: "Automatic bank sync" },
                { id: "b", label: "Before chasing anyone, know which of this month's rents did not arrive" },
                { id: "c", label: "A monthly summary email" },
                { id: "d", label: "CSV import" },
              ],
              correct: ["b"],
              explanation:
                "B says what the person is trying to accomplish, when, and what for. A, C and D are all possible ways to serve it — and until the job is written down, there is no basis on which to choose between them.",
            },
          ],
        },
        {
          slug: "cutting-to-v1",
          title: "Cutting to version one",
          summary:
            "The one path, the things that look essential and are not, and the honest reason to keep each survivor.",
          type: "decision",
          difficulty: "intermediate",
          minutes: 11,
          completion: "knowledge_check",
          skills: ["scoping", "product-thinking"],
          toolbox: ["before-you-write-code"],
          requires: ["jobs-not-features"],
          objectives: [
            "Cut a feature list to the one path that serves the job",
            "Justify every surviving item by the job, not by convention",
          ],
          blocks: [
            {
              id: "t1",
              kind: "text",
              text: "You now have a job and a pile of ideas. Version one is the shortest path from the trigger to the outcome, and the cutting rule is a single question asked of every item: if this were missing, could the person still get the outcome?",
            },
            {
              id: "t2",
              kind: "text",
              text: "The answer is yes far more often than feels comfortable, and the items that survive tend to be unglamorous.",
            },
            {
              id: "tab1",
              kind: "table",
              columns: ["Item", "If it were missing…", "Verdict"],
              rows: [
                ["Upload a statement", "No input, no outcome", "Keep"],
                ["Show what did not arrive", "That is the outcome", "Keep"],
                ["Enter expected rents", "Nothing to compare against", "Keep — but a text box, not a properties system"],
                ["User accounts", "They re-enter three numbers next month", "Cut for now"],
                ["Bank connection", "They download a CSV, which they already do", "Cut"],
                ["Email reminders", "They still see the list when they look", "Cut"],
                ["Settings", "Nobody has asked for an option", "Cut"],
              ],
            },
            {
              id: "cal1",
              kind: "callout",
              tone: "warning",
              title: "Accounts are the most common unnecessary week",
              text: "Sign-up, sign-in, password reset, email verification, session handling and the RLS policies underneath are a week of work that teaches you nothing about whether the product is useful. If ten people can be served without accounts, serve ten people without accounts. LOCK itself has authentication because it holds one learner's private progress — decide it on that basis, not on habit.",
            },
            {
              id: "t3",
              kind: "text",
              text: "There is one class of exception. Anything that would be extremely expensive to add later — a fundamental data-shape decision, or a security boundary — deserves thinking about now even if it is not built now. That is different from building it.",
            },
            {
              id: "q1",
              kind: "choice",
              question:
                "Which item most deserves to survive a version-one cut, even though it is invisible to the user?",
              multiple: false,
              options: [
                { id: "a", label: "A settings page, because users expect one" },
                { id: "b", label: "A data model that will not have to be rewritten when a second property is added" },
                { id: "c", label: "An onboarding tour" },
                { id: "d", label: "A dark mode toggle" },
              ],
              correct: ["b"],
              explanation:
                "Getting the shape of the data roughly right is cheap now and expensive later, because everything you build sits on it. The other three are all visible, all defer cleanly, and all cost you a week you have not earned yet.",
            },
            {
              id: "d1",
              kind: "decision",
              situation:
                "Your version one has no accounts. A user asks whether their data will still be there tomorrow.",
              options: [
                {
                  id: "a",
                  label: "Add accounts now",
                  tradeoff:
                    "Answers the question properly and unblocks repeat use. Costs roughly a week, and you still do not know whether the core is useful.",
                },
                {
                  id: "b",
                  label: "Say no, and see whether they come back anyway",
                  tradeoff:
                    "Keeps you learning. If they return and re-enter their numbers, that is rung-5 evidence about the value. If they do not, accounts would not have saved it.",
                },
                {
                  id: "c",
                  label: "I am not sure yet",
                  tradeoff:
                    "Ask how many people have asked. One person asking is curiosity; three people asking after using it twice is a requirement, and it comes with the evidence you were missing.",
                },
              ],
              recommended: "b",
              explanation:
                "The question is not whether accounts are needed eventually — they are. It is whether they are needed before you know the core works. Waiting turns a guess into an observation, and the observation is worth more than the week.",
            },
          ],
        },
        {
          slug: "writing-a-product-brief",
          title: "The product brief",
          summary:
            "The document you and the execution layer will both work from — and why it is short.",
          type: "workshop",
          difficulty: "intermediate",
          minutes: 10,
          completion: "read",
          skills: ["product-thinking", "technical-planning", "writing"],
          requires: ["cutting-to-v1"],
          objectives: [
            "Write a brief that fits on a page and answers what, for whom, and what is out",
            "Explain why an explicit 'not in version one' list is the most useful section",
          ],
          blocks: [
            {
              id: "t1",
              kind: "text",
              text: "A product brief is not a specification. It is the shortest document that lets somebody else — including an execution layer, and including you in three weeks — make the same decisions you would make.",
            },
            {
              id: "s1",
              kind: "steps",
              title: "Six sections, one page",
              items: [
                "The person, in one sentence, from your problem statement.",
                "The job, with its trigger and its deadline.",
                "The one path: the sequence of actions from trigger to outcome.",
                "What is explicitly not in version one, and why.",
                "What must be true for this to be considered working — one measurable sentence.",
                "The open questions you know you have not answered.",
              ],
            },
            {
              id: "cal1",
              kind: "callout",
              tone: "tip",
              title: "The fourth section is the one that pays for itself",
              text: "An explicit exclusions list is what you point at in week three when you feel like building a settings page. Without it, every addition feels reasonable in the moment, because each one individually is.",
            },
            {
              id: "t2",
              kind: "text",
              text: "The fifth section deserves care. \"It works\" is not measurable. \"A landlord with four flats can go from a downloaded CSV to a list of missing rent in under two minutes, without asking me anything\" is. That sentence is what Phase 07 will test against.",
            },
            {
              id: "t3",
              kind: "text",
              text: "Keep the brief in the repository next to the code, not in a document tool you will stop opening. It is going to be the thing you paste into Claude at the start of every planning session, and it needs to live where the work lives.",
            },
            {
              id: "p1",
              kind: "prompt",
              title: "Pressure-test a brief before you build from it",
              prompt: "Here is my product brief for a first version.\n\nDo not improve it. Instead:\n1. Identify anything in the one path that is under-specified enough that two people would build it differently.\n2. Identify anything in the exclusions list that is actually required for the one path to work at all.\n3. Tell me which single decision in this brief is most likely to be wrong, and what cheap thing would tell me.",
              why: "The failure mode of a brief is not being wrong, it is being vague in a way you cannot see. Asking specifically for under-specification finds it faster than rereading.",
            },
          ],
        },
      ],
      mission: {
        slug: "product-brief",
        title: "Write the product brief",
        summary: "One page that decides what exists in version one, and what does not.",
        type: "writing",
        difficulty: "intermediate",
        minutes: 120,
        objective:
          "Turn your evidence into a one-page brief: the person, the job, the one path, the exclusions, and the measurable definition of working.",
        whyItMatters:
          "This is the document every later phase reads. Design draws it, Build implements it, Test checks it. A vague brief produces vague versions of all three, and you will not notice until the build is half done.",
        objectives: [
          "A one-page brief with all six sections",
          "An explicit exclusions list with reasons",
          "A measurable definition of 'working'",
        ],
        blocks: [
          {
            id: "m1",
            kind: "steps",
            title: "How to work through it",
            items: [
              "Start from your problem statement and your conversation notes. Do not start from a blank page — start from evidence.",
              "Write the job with trigger and deadline.",
              "Write the one path as numbered actions. If it has more than seven, it is not version one.",
              "Write the exclusions, each with one line of reasoning.",
              "Write the measurable definition of working. It must contain a time or a count.",
              "List the open questions honestly. They become Phase 05 and 06 decisions.",
            ],
          },
          {
            id: "m2",
            kind: "callout",
            tone: "real_world",
            title: "Keep it in the repository",
            text: "Save it as a markdown file in the project you are about to create. In Phase 06 you will point the execution layer at it, and a brief that lives beside the code stays current in a way that one in a separate tool does not.",
          },
          {
            id: "m3",
            kind: "checklist",
            title: "Before you submit",
            items: [
              "The one path is seven steps or fewer",
              "Every exclusion has a reason next to it",
              "The definition of working contains a number",
              "Nothing in the brief is there because products usually have it",
            ],
          },
        ],
        deliverableTitle: "Product Brief",
        deliverableDescription:
          "The one-page definition of version one: person, job, path, exclusions, and what working means.",
        requiredEvidence: ["document"],
        requiresLesson: "writing-a-product-brief",
        skills: [
          { key: "product-thinking", primary: true },
          { key: "scoping" },
          { key: "writing" },
        ],
        toolbox: ["before-you-write-code"],
      },
    },
  ],
};
