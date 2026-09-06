import type { PhaseSpec } from "@/lib/curriculum/types";

/**
 * 08 SHIP — put it in front of real people, in production.
 *
 * Two different kinds of fear live in this phase: the technical one about
 * deployment, and the real one about somebody using it. The modules take them
 * in that order because the first is easy and getting it done makes the second
 * unavoidable.
 */
export const ship: PhaseSpec = {
  key: "ship",
  modules: [
    {
      slug: "into-production",
      title: "Getting it into production",
      summary:
        "Deployment, environments, secrets, and knowing when something has broken.",
      lessons: [
        {
          slug: "what-production-means",
          title: "What production actually changes",
          summary:
            "Four things that are different once it is not on your machine.",
          type: "concept",
          difficulty: "intermediate",
          minutes: 9,
          completion: "read",
          skills: ["deployment", "backend"],
          objectives: [
            "Name the four differences between local and production",
            "Say what belongs in an environment variable and why",
          ],
          blocks: [
            {
              id: "t1",
              kind: "text",
              text: "Deploying a small application is mostly a solved problem: connect a repository to a host and it builds on every push. The interesting part is what changes about the software once it is running somewhere you are not.",
            },
            {
              id: "s1",
              kind: "steps",
              title: "The four differences",
              items: [
                "Configuration comes from the environment, not from a file you edited. Anything that differs between your machine and the server is a variable, and every one of them is a way to be broken in production and fine locally.",
                "Secrets are real. A key in the repository is a key in the history, and the history is forever.",
                "You cannot see what happened. Without logging or error reporting, a user's problem is a story they half remember.",
                "Data is somebody else's. A mistaken migration on your machine costs nothing; the same migration in production costs trust.",
              ],
            },
            {
              id: "cal1",
              kind: "callout",
              tone: "warning",
              title: "The most common first deployment failure",
              text: "It builds and then shows a blank page or a server error, because an environment variable that exists on your machine does not exist on the host. Before you debug anything else, list every variable your application reads and confirm each one is set where it is running.",
            },
            {
              id: "t2",
              kind: "text",
              text: "Two environments is the right number for a first product: your machine, and production. A staging environment is a real cost — another database, another set of variables, another thing to keep in step — and it earns its place once you have users who would notice a broken deploy, not before.",
            },
            {
              id: "t3",
              kind: "text",
              text: "Set up error reporting on the first day, not the first incident. Something that emails you when the server throws is fifteen minutes of work and it is the difference between finding out from your logs and finding out from a user who has already left.",
            },
          ],
        },
        {
          slug: "shipping-safely",
          title: "Shipping without breaking what works",
          summary:
            "Migrations, rollbacks, and the checklist that takes five minutes.",
          type: "workshop",
          difficulty: "advanced",
          minutes: 11,
          completion: "knowledge_check",
          skills: ["deployment", "database"],
          toolbox: ["ship-checklist"],
          requires: ["what-production-means"],
          objectives: [
            "Sequence a schema change so that it can be rolled back",
            "Run a pre-ship check that catches the common failures",
          ],
          blocks: [
            {
              id: "t1",
              kind: "text",
              text: "Code can be rolled back in seconds. Data cannot. That asymmetry is the whole of safe shipping, and it means schema changes need a different kind of care from everything else.",
            },
            {
              id: "h1",
              kind: "heading",
              level: 2,
              text: "The order that makes a change reversible",
            },
            {
              id: "s1",
              kind: "steps",
              title: "Adding a required field, safely",
              items: [
                "Ship the column as nullable. The old code ignores it and keeps working.",
                "Ship the code that writes it. Now new rows have it and old rows do not.",
                "Backfill the old rows, separately, and check the result.",
                "Only then make it required.",
              ],
            },
            {
              id: "t2",
              kind: "text",
              text: "Four deployments instead of one, and at every point you can roll the code back without the database being wrong. Doing it in a single step means a rollback leaves you with a schema the previous code does not understand, which is the worst position to be in at speed.",
            },
            {
              id: "cal1",
              kind: "callout",
              tone: "warning",
              title: "Take a backup before any destructive change",
              text: "Dropping a column, renaming a table, or any migration you have not run on a copy first. Confirm the backup exists and that you know how to restore it. A backup you have never tested restoring is a hope.",
            },
            {
              id: "h2",
              kind: "heading",
              level: 2,
              text: "The five-minute pre-ship check",
            },
            {
              id: "ch1",
              kind: "checklist",
              title: "Every time",
              items: [
                "The build passes and the tests are green",
                "Every environment variable the code reads exists in production",
                "No secret is in the diff",
                "The migration has been run on a copy of production data",
                "You know what you would click to roll it back",
              ],
            },
            {
              id: "q1",
              kind: "choice",
              question:
                "Why add a new required column as nullable first, in a separate deployment?",
              multiple: false,
              options: [
                { id: "a", label: "It is faster to run" },
                { id: "b", label: "So the code can be rolled back at any point without the database being in a state it does not understand" },
                { id: "c", label: "Because databases do not allow adding required columns" },
                { id: "d", label: "To avoid locking the table" },
              ],
              correct: ["b"],
              explanation:
                "Reversibility is the reason. Locking can matter at scale and is not the point here. Shipping schema and code together means a rollback of the code leaves the schema ahead of it — and that is exactly when you least want to be improvising.",
            },
          ],
        },
        {
          slug: "the-first-real-user",
          title: "The first real user",
          summary:
            "Watching somebody use it, and resisting the urge to help.",
          type: "workshop",
          difficulty: "intermediate",
          minutes: 10,
          completion: "read",
          skills: ["ux-thinking", "product-iteration"],
          requires: ["shipping-safely"],
          objectives: [
            "Run a session where you watch rather than explain",
            "Separate a usability problem from a value problem",
          ],
          blocks: [
            {
              id: "t1",
              kind: "text",
              text: "Send it to one of the people from your research. Then watch them use it, and say nothing. This is much harder than it sounds and it is the most informative twenty minutes of the phase.",
            },
            {
              id: "s1",
              kind: "steps",
              title: "How to run it",
              items: [
                "Give them the task in their own words: \"find out which rent did not arrive last month\". Not a tour.",
                "Ask them to think aloud. Remind them once, then stop.",
                "Do not help. When they are stuck, count to twenty before saying anything. Being stuck is the finding.",
                "Note where they hesitate, what they misread, and what they expected to happen and did not.",
                "Afterwards, ask what they would do next if you were not there.",
              ],
            },
            {
              id: "cal1",
              kind: "callout",
              tone: "why",
              title: "Two different failures that look identical",
              text: "They could not work out how to use it — a usability problem, and cheap to fix. Or they used it fine and did not care about the result — a value problem, and much more serious. The last question separates them, and it is the one people forget to ask because the session felt positive.",
            },
            {
              id: "t2",
              kind: "text",
              text: "Expect the first session to be uncomfortable. Something obvious will confuse them, and your instinct will be to explain that they clicked the wrong thing. The explanation you are about to give is exactly the thing the product should have said.",
            },
            {
              id: "pr1",
              kind: "predict",
              situation:
                "Your first user completes the task successfully in four minutes, says it is useful, and thanks you.",
              prompt:
                "How much have you learned? Optional — commit before reading on.",
              reveal:
                "Less than it feels. A successful session with a polite person is roughly rung 2 evidence. The question that turns it into something is whether they come back next month without being asked, and whether they do it with their own real data rather than a sample you provided. Watch for the second visit; that is the signal.",
            },
          ],
        },
      ],
      mission: {
        slug: "ship-it",
        title: "Ship it and watch somebody use it",
        summary:
          "In production, on a real address, with one real person in front of it.",
        type: "deploy",
        difficulty: "advanced",
        minutes: 300,
        objective:
          "Deploy the product to production and run one observed session with a real user from your research.",
        whyItMatters:
          "Everything until now has been preparation. A product that is not deployed is a private opinion, and a user you have not watched is a guess about how it is used.",
        objectives: [
          "A live URL that works from a device you have never used it on",
          "Error reporting in place before the first user arrives",
          "Notes from one observed session, including where they got stuck",
        ],
        blocks: [
          {
            id: "m1",
            kind: "steps",
            title: "How to work through it",
            items: [
              "Deploy. Set every environment variable and confirm the build reaches a working page.",
              "Open it on a device you have never used it on. Phone, someone else's laptop. This catches configuration errors nothing else will.",
              "Turn on error reporting.",
              "Run the pre-ship checklist.",
              "Send it to one person from your research and watch them use it. Say nothing for twenty minutes.",
              "Write up where they hesitated, and the answer to \"what would you do next if I were not here\".",
            ],
          },
          {
            id: "m2",
            kind: "callout",
            tone: "tip",
            title: "If it does not work in production and does locally",
            text: "It is an environment variable roughly three times out of four. Check them first, before you look at anything else. After that, look at the build log rather than the running application: the failure is often earlier than it appears.",
          },
          {
            id: "m3",
            kind: "checklist",
            title: "Before you submit",
            items: [
              "The live URL works on a device you have never used it on",
              "Error reporting is on and you have tested that it reports",
              "One real user has used it while you watched",
              "You asked what they would do next if you were not there",
            ],
          },
        ],
        deliverableTitle: "Ship Report",
        deliverableDescription:
          "The live URL, the deployment notes, and what happened when a real person used it.",
        requiredEvidence: ["deployment", "url", "note"],
        requiresReflection: true,
        requiresLesson: "the-first-real-user",
        skills: [
          { key: "deployment", primary: true },
          { key: "ux-thinking" },
          { key: "product-iteration" },
        ],
        toolbox: ["ship-checklist"],
      },
    },
  ],
};
