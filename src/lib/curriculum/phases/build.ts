import type { PhaseSpec } from "@/lib/curriculum/types";

/**
 * 06 BUILD — direct the execution layer and ship real software.
 *
 * The largest phase, and the one with the strongest opinion in it: the skill
 * being taught is direction and verification, not prompting. Every lesson that
 * shows how to get something built is followed by how to check that it was
 * built correctly, because a founder who cannot check is not in control of
 * their own product.
 */
export const build: PhaseSpec = {
  key: "build",
  modules: [
    {
      slug: "the-build-loop",
      title: "The build loop",
      summary:
        "Explore, plan, build, verify — the cycle that keeps an AI-built codebase under control.",
      lessons: [
        {
          slug: "your-role-and-its-role",
          title: "Your job, and the model's job",
          summary:
            "What you are responsible for when the typing is no longer the bottleneck.",
          type: "concept",
          difficulty: "intermediate",
          minutes: 9,
          completion: "read",
          skills: ["ai-workflow", "claude-code"],
          objectives: [
            "State which decisions never transfer to the execution layer",
            "Recognise the failure mode of accepting work you cannot evaluate",
          ],
          blocks: [
            {
              id: "t1",
              kind: "text",
              text: "An execution layer will write more code in an hour than you could in a week, and it will do it confidently whether or not it is right. That changes what your job is. It does not remove your job.",
            },
            {
              id: "tab1",
              kind: "table",
              columns: ["Yours, always", "Shared", "Mostly the model's"],
              rows: [
                ["What to build and what to leave out", "Architecture and data shape", "Implementation of a defined task"],
                ["Whether the result is correct", "Naming and structure", "Boilerplate and wiring"],
                ["Whether it is worth building at all", "Test strategy", "Refactoring within a file"],
                ["Security and data boundaries", "Debugging", "Repetitive edits across many files"],
              ],
            },
            {
              id: "cal1",
              kind: "callout",
              tone: "why",
              title: "The failure that matters",
              text: "Accepting work you cannot evaluate. It is not that the model is unreliable — it is often better than you would be. It is that a codebase you cannot reason about is one you cannot change, and the moment something breaks in front of a user you are stuck with an artefact instead of a product.",
            },
            {
              id: "t2",
              kind: "text",
              text: "The practical rule for this phase: never accept a change you could not explain to somebody else in two sentences. Not write yourself — explain. That is a much lower bar than writing it, and it is enough to keep you in control.",
            },
            {
              id: "t3",
              kind: "text",
              text: "The second rule: the model does not know what you decided in Phases 01 to 05 unless you tell it. Your product brief and your UX blueprint are not documentation, they are inputs. Most disappointing output is a context problem wearing the costume of a capability problem.",
            },
            {
              id: "d1",
              kind: "decision",
              situation:
                "You asked for a feature. Three hundred lines came back, it appears to work, and you do not understand about eighty of them.",
              options: [
                {
                  id: "a",
                  label: "Accept it — it works, and you can come back to it",
                  tradeoff:
                    "Fast today. Those eighty lines are now load-bearing and unreviewed, and you will meet them again during a bug at the worst possible moment.",
                },
                {
                  id: "b",
                  label: "Ask for an explanation of the part you do not understand, then decide",
                  tradeoff:
                    "Costs ten minutes. Usually reveals either a legitimate technique you have just learned, or something more complicated than the problem required — which is the more common outcome.",
                },
                {
                  id: "c",
                  label: "Reject it and write it yourself",
                  tradeoff:
                    "Maximum understanding, and it throws away most of the speed advantage. Occasionally right for a security boundary; wrong as a default.",
                },
                {
                  id: "d",
                  label: "I am not sure I can tell whether I understand it well enough",
                  tradeoff:
                    "A completely reasonable position early on, and there is a concrete test for it: try to say aloud what those eighty lines do, in two sentences. If you cannot, you are in the case option B is for.",
                },
              ],
              recommended: "b",
              explanation:
                "Asking is cheap and it is the habit that compounds. In practice a large fraction of unexplainable output turns out to be over-engineering, and asking \"why is this necessary\" produces a simpler version. You are also, incidentally, learning — which is the whole point of doing this rather than hiring someone.",
            },
          ],
        },
        {
          slug: "explore-plan-build-verify",
          title: "Explore, plan, build, verify",
          summary:
            "The loop, why the planning step is the one people skip, and what each stage produces.",
          type: "workshop",
          difficulty: "intermediate",
          minutes: 12,
          completion: "knowledge_check",
          skills: ["ai-workflow", "claude-code", "technical-planning"],
          toolbox: ["explore-plan-build-verify", "plan-before-you-build"],
          requires: ["your-role-and-its-role"],
          objectives: [
            "Run one task through all four stages",
            "Say what goes wrong when the plan stage is skipped",
          ],
          blocks: [
            {
              id: "t1",
              kind: "text",
              text: "One loop, four stages, and it applies to a two-line fix as much as to a new feature. The discipline is that each stage produces something you can look at before the next begins.",
            },
            {
              id: "h1",
              kind: "heading",
              level: 2,
              text: "Explore",
            },
            {
              id: "t2",
              kind: "text",
              text: "Before changing anything, understand what is there. Ask the execution layer to read the relevant files and tell you how the thing currently works — where the data comes from, what calls what, what would be affected by a change. In a new project this is quick. In an existing one it is the difference between a surgical change and a mess.",
            },
            {
              id: "h2",
              kind: "heading",
              level: 2,
              text: "Plan",
            },
            {
              id: "t3",
              kind: "text",
              text: "Ask for the plan and read it before any code is written. Which files, what changes in each, what the data shape becomes, what could break. This is the stage that gets skipped, and skipping it is the single biggest cause of a session that produces four hundred lines of the wrong thing.",
            },
            {
              id: "cal1",
              kind: "callout",
              tone: "why",
              title: "Why the plan is worth five minutes",
              text: "A wrong plan is one paragraph to correct. A wrong implementation is a diff to unpick, and by the time you see it you are already invested in it. Reading a plan is also how you learn the codebase without reading every line of it.",
            },
            {
              id: "h3",
              kind: "heading",
              level: 2,
              text: "Build",
            },
            {
              id: "t4",
              kind: "text",
              text: "One task at a time, small enough to review in a sitting. If a plan has six steps, do them as six exchanges rather than one. The temptation to ask for everything at once is strong and it is where control is lost.",
            },
            {
              id: "h4",
              kind: "heading",
              level: 2,
              text: "Verify",
            },
            {
              id: "t5",
              kind: "text",
              text: "Not \"does it look right\". Run it. Click the actual path a user would take. Check the failure case, not only the success case. Read the diff. If a test exists, run it; if one should exist, this is when it gets written.",
            },
            {
              id: "s1",
              kind: "steps",
              title: "The same loop, said as four things you actually type",
              items: [
                "\"Read these files and tell me how X currently works, and what would be affected if I changed Y.\"",
                "\"Do not write code yet. Give me a plan: files, changes, data shape, and what could break.\"",
                "\"Implement step 1 only.\"",
                "\"What should I click to check this, including the case where it fails?\" — then go and do it.",
              ],
            },
            {
              id: "q1",
              kind: "choice",
              question: "Which stage is most often skipped, and what does skipping it cost?",
              multiple: false,
              options: [
                { id: "a", label: "Explore — you lose naming consistency" },
                { id: "b", label: "Plan — you find out the approach was wrong only after the code exists" },
                { id: "c", label: "Build — nothing gets made" },
                { id: "d", label: "Verify — the tests are slower" },
              ],
              correct: ["b"],
              explanation:
                "Plan is the cheap stage to be wrong in and the expensive stage to skip. Verify is skipped almost as often and is equally damaging, but its cost arrives later, which is exactly why the plan is the habit to build first.",
            },
            {
              id: "cal2",
              kind: "callout",
              tone: "tip",
              title: "Write the context down once",
              text: "Most tools that work with a codebase will read a project-level instructions file if one exists. Put your product brief's summary, your conventions and your definition of done in it, and stop re-explaining them every session. You are reading a product that does exactly this.",
            },
          ],
        },
        {
          slug: "reading-a-diff",
          title: "Reading a diff you did not write",
          summary:
            "What to look at first, and the four things that should make you stop.",
          type: "workshop",
          difficulty: "intermediate",
          minutes: 11,
          completion: "read",
          skills: ["claude-code", "debugging", "critical-thinking"],
          requires: ["explore-plan-build-verify"],
          objectives: [
            "Review a change in a fixed order rather than top to bottom",
            "Name four patterns that justify rejecting generated code",
          ],
          blocks: [
            {
              id: "t1",
              kind: "text",
              text: "Reading a diff top to bottom is the slow way and it is how things get missed. Read it in this order instead, and stop as soon as something fails.",
            },
            {
              id: "s1",
              kind: "steps",
              title: "The order to read in",
              items: [
                "Which files changed. If a file you did not expect is in the list, find out why before reading a single line.",
                "Anything deleted. Deletions are where behaviour silently disappears, and they are easy to skim past.",
                "The data layer. Schema, queries, anything touching permissions. This is where mistakes are expensive.",
                "The new logic. Only now, and only the parts that are actually new.",
                "The tests, if any. A change with no test and no manual check is not finished.",
              ],
            },
            {
              id: "h1",
              kind: "heading",
              level: 2,
              text: "Four things that should stop you",
            },
            {
              id: "tab1",
              kind: "table",
              columns: ["Pattern", "Why it is a problem"],
              rows: [
                ["A check removed to make something pass", "The check was the feature. This is the most dangerous single pattern."],
                ["A `catch` that swallows the error", "The failure still happens; you have only removed your ability to see it."],
                ["Data filtered in the application that should be filtered in the database", "The unfiltered rows were still sent. On anything multi-user this is a leak."],
                ["A new dependency for something small", "Every dependency is permanent. Ask what it does that twenty lines could not."],
              ],
            },
            {
              id: "cal1",
              kind: "callout",
              tone: "warning",
              title: "The most expensive one in a product with users",
              text: "Filtering in the wrong place. Fetching every row and hiding some in the interface looks identical on screen and is a data breach in an API response. If your product has more than one user, every query needs an answer to \"what stops this returning somebody else's rows\", and the answer should live in the database.",
            },
            {
              id: "t2",
              kind: "text",
              text: "There is also a positive signal worth learning to see: a change that is smaller than you expected, in fewer files than you expected. That usually means the model found the right place. A change that touches nine files to add one field usually means it did not.",
            },
            {
              id: "p1",
              kind: "prompt",
              title: "Review a change you do not fully understand",
              prompt: "Here is a diff you produced.\n\nDo not defend it. Answer these separately:\n1. What behaviour changes for a user, in one sentence.\n2. What could break that is not visible in this diff.\n3. Is there anything here that is more complicated than the task required? If so, show the simpler version.\n4. What is the single most likely bug in this change, and exactly what would I click to hit it?",
              why: "Asking for the most likely bug and the click that reproduces it converts a review from reading into testing, and the fourth answer is usually the one that finds something.",
            },
          ],
        },
      ],
      mission: {
        slug: "technical-blueprint",
        title: "Plan the build",
        summary:
          "The stack, the data shape, and the order you will build in — decided before any code.",
        type: "build",
        difficulty: "intermediate",
        minutes: 120,
        objective:
          "Produce a technical plan for version one: data model, stack decisions, build order, and what you will verify at each step.",
        whyItMatters:
          "The data shape is the one decision that is expensive to change later, because everything sits on it. An hour here saves a rewrite, and the build order decides whether you have something working in week one or week four.",
        objectives: [
          "A data model with every table, its columns and who may read each row",
          "A build order in vertical slices, not layers",
          "A verification step written for each slice",
        ],
        blocks: [
          {
            id: "m1",
            kind: "text",
            text: "Build in vertical slices. One complete path from interface to database that a person can actually use, then the next. Building all the database, then all the API, then all the interface means nothing works until the end, and you learn nothing until then either.",
          },
          {
            id: "m2",
            kind: "steps",
            title: "How to work through it",
            items: [
              "Write the data model. For each table: what it holds, its columns, and one line on who is allowed to read a row and why.",
              "Decide the stack, briefly. Prefer what you can get help with over what is theoretically best.",
              "Break version one into three to five vertical slices, each ending in something usable.",
              "For each slice, write the verification: what you will click, and what the failure case looks like.",
              "Use the execution layer to critique the plan before you build from it.",
            ],
          },
          {
            id: "m3",
            kind: "callout",
            tone: "tip",
            title: "Ask for the plan to be attacked, not approved",
            text: "Paste your data model in and ask which part will need to change first as the product grows, and what the cheapest way to be wrong about it is. A model that agrees with your plan has told you nothing.",
          },
          {
            id: "m4",
            kind: "checklist",
            title: "Before you submit",
            items: [
              "Every table has a stated rule for who may read a row",
              "The slices are vertical — each one ends in something a person can use",
              "Each slice has a written verification step",
              "The stack choices have one line of reasoning each",
            ],
          },
        ],
        deliverableTitle: "Technical Blueprint",
        deliverableDescription:
          "The data model with access rules, the stack decisions, the vertical slices and how each will be verified.",
        requiredEvidence: ["document"],
        requiresLesson: "reading-a-diff",
        skills: [
          { key: "technical-planning", primary: true },
          { key: "database" },
          { key: "ai-workflow" },
        ],
        toolbox: ["technical-blueprint", "plan-before-you-build", "explore-plan-build-verify"],
      },
    },

    {
      slug: "building-the-first-slice",
      title: "Building the first slice",
      summary:
        "From an empty repository to something one person can actually use.",
      lessons: [
        {
          slug: "setting-up-to-move-fast",
          title: "Setting up so you can move fast later",
          summary:
            "The four things worth doing in the first hour, and the ones that can wait.",
          type: "build",
          difficulty: "intermediate",
          minutes: 10,
          completion: "read",
          skills: ["claude-code", "frontend", "backend"],
          objectives: [
            "Set up a project so that mistakes are cheap to undo",
            "Say why version control matters more when you are not writing the code",
          ],
          blocks: [
            {
              id: "t1",
              kind: "text",
              text: "Four things in the first hour. Everything else — linting rules, CI pipelines, folder conventions — can wait until there is something to protect.",
            },
            {
              id: "s1",
              kind: "steps",
              title: "The first hour",
              items: [
                "A repository, with a commit before you have written anything. This is your undo.",
                "A running application, however empty. Being able to see something in a browser is what makes every later step verifiable.",
                "A project instructions file containing your product brief in miniature, your conventions and your definition of done.",
                "A way to run it and a way to check it — the two commands you will type a hundred times.",
              ],
            },
            {
              id: "cal1",
              kind: "callout",
              tone: "why",
              title: "Version control matters more, not less, when AI writes the code",
              text: "You will accept changes faster than you can fully evaluate them, and some of them will be wrong in ways you find out about an hour later. A commit after every working step turns that from a disaster into an inconvenience. Commit small and commit often, and write messages that say why rather than what.",
            },
            {
              id: "t2",
              kind: "text",
              text: "A word on stack choice, since it is the decision people spend longest on and it matters least. Pick something with an enormous amount of public material, because that is what your execution layer has learned from and what you will find answers about. Boring and widely used beats new and interesting for a first product, every time.",
            },
            {
              id: "t3",
              kind: "text",
              text: "Keep secrets out of the repository from the first commit. An API key in a file is trivial to add and unpleasant to remove, because it stays in the history. Use environment variables from the start, before there is anything worth stealing.",
            },
            {
              id: "term1",
              kind: "terminal",
              command: "git add -A && git commit -m \"Working: statement upload returns a match list\"",
              output: "The message that helps later says what now works, not which files changed.",
            },
          ],
        },
        {
          slug: "one-slice-at-a-time",
          title: "One slice at a time",
          summary:
            "How to take a feature from plan to working without losing the thread.",
          type: "build",
          difficulty: "intermediate",
          minutes: 12,
          completion: "read",
          skills: ["claude-code", "ai-workflow", "frontend"],
          requires: ["setting-up-to-move-fast"],
          objectives: [
            "Take one vertical slice through the whole loop",
            "Keep a session focused when the model offers to do more",
          ],
          blocks: [
            {
              id: "t1",
              kind: "text",
              text: "A slice is the smallest change that leaves the product more useful than it was. Not a layer, not a file — a path a person can walk.",
            },
            {
              id: "t2",
              kind: "text",
              text: "For the rent example the first slice is: paste in what you expect, upload a CSV, see what is missing. No accounts, no storage, no styling worth mentioning. It is ugly and it answers the question.",
            },
            {
              id: "h1",
              kind: "heading",
              level: 2,
              text: "The session, in practice",
            },
            {
              id: "s1",
              kind: "steps",
              title: "One slice",
              items: [
                "State the slice and the definition of done in one message. Include the relevant part of the brief.",
                "Ask for a plan. Read it. Correct the approach, not the code.",
                "Implement the first step. Run it. Look at it in a browser.",
                "Commit. Then the next step.",
                "When the slice is done, use it yourself as a user would, including with bad input.",
              ],
            },
            {
              id: "cal1",
              kind: "callout",
              tone: "warning",
              title: "The offer to do more",
              text: "You will regularly be offered adjacent improvements — error handling you did not ask for, a component extracted, a config file tidied. Some are good. All of them make the diff harder to review, and accepting them by default is how a focused session becomes a two-hundred-file change you no longer understand. Say no, and note the good ones for later.",
            },
            {
              id: "t3",
              kind: "text",
              text: "When something is not working after two attempts, stop iterating and go back to explore. Ask what the code actually does now, rather than asking again for what you wanted. Repeated attempts at the same instruction is the clearest signal that the problem is understanding rather than execution.",
            },
            {
              id: "d1",
              kind: "decision",
              situation:
                "Your first slice works but the code is untidy — repeated logic, a long function, poor names.",
              options: [
                {
                  id: "a",
                  label: "Refactor now, while it is fresh",
                  tradeoff:
                    "Cleaner base for the next slice. Costs time on code that may be deleted entirely once you learn what users do.",
                },
                {
                  id: "b",
                  label: "Leave it, finish the second slice, then refactor with more information",
                  tradeoff:
                    "Faster to a usable product, and you will refactor knowing which parts are permanent. Risk: untidy becomes normal and never gets addressed.",
                },
                {
                  id: "c",
                  label: "I am not sure yet",
                  tradeoff:
                    "Use a test: is the untidiness slowing down the next slice? If yes, fix it now. If it is only aesthetic, it can wait.",
                },
              ],
              recommended: "b",
              explanation:
                "Early code has a high chance of being deleted, so polishing it is often wasted. The exception is anything you are about to build on — a data shape or a shared function — where untidiness compounds. Refactor what you are about to depend on; leave the rest.",
            },
          ],
        },
        {
          slug: "spotting-plausible-wrong-code",
          title: "Code that looks right and is not",
          summary:
            "Four specific ways generated code fails silently, and how to catch each one.",
          type: "debug",
          difficulty: "advanced",
          minutes: 12,
          completion: "knowledge_check",
          skills: ["debugging", "critical-thinking", "backend"],
          requires: ["one-slice-at-a-time"],
          objectives: [
            "Name four ways generated code passes review and still fails",
            "Design a check for each one",
          ],
          blocks: [
            {
              id: "t1",
              kind: "text",
              text: "Generated code is usually syntactically fine and often semantically fine. The failures that get through are the ones that look completely normal, and there are four you will meet repeatedly.",
            },
            {
              id: "h1",
              kind: "heading",
              level: 2,
              text: "1. The invented interface",
            },
            {
              id: "t2",
              kind: "text",
              text: "A method, option or field that does not exist, used exactly as though it does. It appears in libraries where a similar name exists elsewhere, and it fails at runtime rather than at build time in a dynamically typed language. The check: if you have not seen that function before, look it up in the documentation rather than assuming.",
            },
            {
              id: "h2",
              kind: "heading",
              level: 2,
              text: "2. The happy path only",
            },
            {
              id: "t3",
              kind: "text",
              text: "Works perfectly with correct input. Empty list, malformed file, duplicate row, network failure — any of these produce a blank screen or a crash. The check: before accepting a slice, try it with nothing, with rubbish, and twice in a row.",
            },
            {
              id: "h3",
              kind: "heading",
              level: 2,
              text: "3. The security shortcut",
            },
            {
              id: "t4",
              kind: "text",
              text: "The version that works is the version without the check. Permission verified in the interface rather than on the server. A row fetched by an id that came from the request without confirming ownership. It is invisible in the browser and total in an API response. The check: for anything touching data, ask what stops another user's id from working here.",
            },
            {
              id: "h4",
              kind: "heading",
              level: 2,
              text: "4. The confident fabrication in the middle",
            },
            {
              id: "t5",
              kind: "text",
              text: "Ninety per cent correct with an invented constant, a wrong default, or a subtly incorrect formula in the middle. This is the hardest to catch by reading, because everything around it is right. The check: for anything with a calculation, test it with numbers you can verify by hand.",
            },
            {
              id: "q1",
              kind: "choice",
              question:
                "Your product fetches a record by an id taken from the URL and displays it. What is the question to ask?",
              multiple: false,
              options: [
                { id: "a", label: "Is the query fast enough?" },
                { id: "b", label: "What stops somebody changing the id in the URL and seeing another user's record?" },
                { id: "c", label: "Is the id formatted correctly?" },
                { id: "d", label: "Should this be cached?" },
              ],
              correct: ["b"],
              explanation:
                "This is the most common serious flaw in generated code and it is invisible in normal use, because in normal use the id is always yours. The answer should be a rule in the database, not a check in the interface — the interface is a suggestion, the database is a boundary.",
            },
            {
              id: "cal1",
              kind: "callout",
              tone: "real_world",
              title: "A worked example from this codebase",
              text: "LOCK once had insert permissions granted on whole tables rather than on specific columns. Row-level security was correct and did not help: the policies decided which rows a learner could touch, and the grants decided which columns — so a client could write a column it should never have been able to set. It was found by building a real client and trying it, not by reading the code. Verification beats inspection.",
            },
          ],
        },
      ],
      mission: {
        slug: "first-slice",
        title: "Build the first slice",
        summary:
          "One complete path from interface to data that a real person can use.",
        type: "build",
        difficulty: "intermediate",
        minutes: 480,
        objective:
          "Build and verify the first vertical slice of your product: the shortest path from trigger to outcome, working end to end.",
        whyItMatters:
          "This is the first time your product exists. It is also the first time your plan meets reality, and what you learn here will change the rest of the blueprint — which is the point.",
        objectives: [
          "One path working end to end, in a repository, with commits",
          "The failure cases tried: empty, malformed, twice in a row",
          "A note of everything the build taught you that the plan got wrong",
        ],
        blocks: [
          {
            id: "m1",
            kind: "text",
            text: "Ugly is fine. Unstyled is fine. Manual steps are fine. The only thing that is not fine is a path that does not run.",
          },
          {
            id: "m2",
            kind: "steps",
            title: "How to work through it",
            items: [
              "Set up the repository, the running application and the instructions file.",
              "Take the first slice through explore, plan, build, verify. Commit at each working point.",
              "Use it yourself as the user would, with real data of your own.",
              "Break it deliberately: empty input, wrong format, the same action twice.",
              "Write down what the build taught you that the blueprint got wrong.",
            ],
          },
          {
            id: "m3",
            kind: "callout",
            tone: "tip",
            title: "If you get stuck for more than thirty minutes",
            text: "Stop asking for the fix and start asking what is actually happening. Print the value, read the error properly, ask the execution layer to explain the current behaviour rather than to change it. Almost every long block is a misunderstanding rather than a hard problem.",
          },
          {
            id: "m4",
            kind: "checklist",
            title: "Before you submit",
            items: [
              "The path runs end to end without you editing code mid-way",
              "You have tried it with empty and with malformed input",
              "The repository has more than one commit and the messages say what works",
              "No secrets are committed",
            ],
          },
        ],
        deliverableTitle: "First Slice",
        deliverableDescription:
          "A repository containing one working path through your product, and a note on what the build changed about the plan.",
        requiredEvidence: ["repository", "note"],
        requiresLesson: "spotting-plausible-wrong-code",
        skills: [
          { key: "claude-code", primary: true },
          { key: "frontend" },
          { key: "backend" },
          { key: "ai-workflow" },
        ],
        toolbox: ["explore-plan-build-verify", "plan-before-you-build"],
      },
    },

    {
      slug: "data-and-boundaries",
      title: "Data, accounts and the boundaries that matter",
      summary:
        "The parts that are invisible when they work and catastrophic when they do not.",
      lessons: [
        {
          slug: "designing-a-schema",
          title: "Designing a schema you will not regret",
          summary:
            "Five decisions that are cheap now and expensive in three months.",
          type: "concept",
          difficulty: "advanced",
          minutes: 11,
          completion: "read",
          skills: ["database", "backend", "technical-planning"],
          objectives: [
            "Make the five schema decisions that are hard to reverse",
            "Say why the database, not the application, should enforce a rule",
          ],
          blocks: [
            {
              id: "t1",
              kind: "text",
              text: "Most of a schema can be changed later without much pain. Five things cannot, and they are worth twenty minutes each.",
            },
            {
              id: "s1",
              kind: "steps",
              title: "The five",
              items: [
                "Ownership. Every row that belongs to somebody needs a column that says who, from the first migration. Adding it later means backfilling and guessing.",
                "Identity. What a user is, and what happens to their data if they leave. This decides half your foreign keys.",
                "Time. Store when things happened, in UTC, with a timezone-aware type. Reconstructing history you did not record is impossible.",
                "The difference between deleted and gone. Soft deletion changes every query you will ever write, so decide it once, deliberately.",
                "What must never be two things at once. If a state machine exists, say so in a constraint rather than in a comment.",
              ],
            },
            {
              id: "cal1",
              kind: "callout",
              tone: "why",
              title: "Put rules in the database, not only in the application",
              text: "Application code is one path to your data. There will be others: a script, a background job, an admin tool, a second client, an execution layer running a query at three in the morning. A constraint in the database holds for all of them. A check in a form holds for one.",
            },
            {
              id: "t2",
              kind: "text",
              text: "The same applies to permissions. If your database supports row-level rules, use them: the rule that says \"a learner sees only their own progress\" belongs next to the data, where it applies to every query anyone ever writes, rather than in a `where` clause somebody will forget.",
            },
            {
              id: "t3",
              kind: "text",
              text: "One more, and it is the one that catches people who let an execution layer design the schema: resist the model that is technically elegant and hard to explain. If you cannot describe your tables to somebody in a minute, you will make mistakes against them for months.",
            },
          ],
        },
        {
          slug: "accounts-and-access",
          title: "Accounts, and who can see what",
          summary:
            "Authentication, authorisation, and the difference that causes most data leaks.",
          type: "concept",
          difficulty: "advanced",
          minutes: 11,
          completion: "knowledge_check",
          skills: ["authentication", "backend", "database"],
          toolbox: ["supabase-rls-docs"],
          requires: ["designing-a-schema"],
          objectives: [
            "Distinguish authentication from authorisation and say where each belongs",
            "Test an access rule the way an attacker would",
          ],
          blocks: [
            {
              id: "t1",
              kind: "text",
              text: "Two different questions that get built as one thing. Authentication asks who you are. Authorisation asks what you may touch. Almost every serious data leak in a small product is an authorisation failure in an application that authenticates perfectly well.",
            },
            {
              id: "t2",
              kind: "text",
              text: "Use a provider for authentication. Passwords, sessions, resets and social sign-in are solved problems with sharp edges, and hand-rolling them buys you nothing. Authorisation is yours, because only you know what your data means.",
            },
            {
              id: "h1",
              kind: "heading",
              level: 2,
              text: "The rule that prevents the common failure",
            },
            {
              id: "t3",
              kind: "text",
              text: "Never take the identity of the person acting from the request. Take it from the session, on the server. A form field, a URL parameter or a header saying who you are is a suggestion from whoever is calling you.",
            },
            {
              id: "c1",
              kind: "comparison",
              title: "The same operation, two ways",
              left: {
                label: "Leaks",
                points: [
                  "Read the user id from the request body",
                  "Fetch the record by the id in the URL",
                  "Check in the interface whether to show it",
                  "Works perfectly until somebody changes a number",
                ],
              },
              right: {
                label: "Holds",
                points: [
                  "Read the user id from the session on the server",
                  "Let the database policy decide which rows exist for that user",
                  "The interface renders whatever came back",
                  "Changing the number in the URL returns nothing",
                ],
              },
            },
            {
              id: "cal1",
              kind: "callout",
              tone: "warning",
              title: "Test it the way an attacker would",
              text: "Create two accounts. Sign in as the first, note an id. Sign in as the second and request the first one's record directly — through the URL and through the API. If anything comes back, you have found the bug before a user did. Do this for every resource type, once, and do it again whenever the data model changes.",
            },
            {
              id: "q1",
              kind: "choice",
              question:
                "Your application filters the list in the browser so each user only sees their own rows. What is wrong?",
              multiple: false,
              options: [
                { id: "a", label: "Nothing, as long as the filter is correct" },
                { id: "b", label: "The server already sent every row; the filter only hides them" },
                { id: "c", label: "It is slower than filtering on the server" },
                { id: "d", label: "It will not work if JavaScript is disabled" },
              ],
              correct: ["b"],
              explanation:
                "B is the security answer and the reason this matters: the data left the server. Anyone can open the network tab and read the response. Performance is a real secondary cost, but it is not the problem — filtering must happen where the data lives.",
            },
            {
              id: "ex1",
              kind: "expandable",
              summary: "What LOCK does, as a worked example",
              text: "Every table has row-level security enabled and policies written in terms of the authenticated user's id. The application never adds a `where profile_id = ...` clause, because the policy already does it — which means a query written carelessly, by a person or by an execution layer, still cannot return somebody else's rows. Column-level grants sit on top for the columns a client must never write, such as a role. The rules are in the database, and the tests that prove them run against a real one.",
            },
          ],
        },
        {
          slug: "when-it-breaks",
          title: "When it breaks",
          summary:
            "A method for debugging that works whether or not you understand the code.",
          type: "debug",
          difficulty: "advanced",
          minutes: 12,
          completion: "read",
          skills: ["debugging", "backend", "claude-code"],
          requires: ["accounts-and-access"],
          objectives: [
            "Localise a fault before attempting a fix",
            "Use an execution layer for diagnosis rather than for guessing",
          ],
          blocks: [
            {
              id: "t1",
              kind: "text",
              text: "The instinct when something breaks is to describe the symptom and ask for a fix. That produces a plausible change to a place that may have nothing to do with it, and two of those in a row leaves you with a new bug on top of the old one.",
            },
            {
              id: "s1",
              kind: "steps",
              title: "Localise first",
              items: [
                "Reproduce it deliberately. If you cannot make it happen on demand, you cannot know when it is fixed.",
                "Read the actual error, all of it, including the first line — which is usually the true one.",
                "Find the boundary: does the right data arrive at the server? Does the right thing reach the database? Does the right thing come back? One of those three answers is no.",
                "Only now form a hypothesis, and say it out loud as a sentence that could be false.",
                "Change one thing. If it does not fix it, put it back before trying the next.",
              ],
            },
            {
              id: "cal1",
              kind: "callout",
              tone: "tip",
              title: "The single most useful debugging question",
              text: "\"What do you expect this value to be here, and what is it actually?\" Print both. Most bugs die at this question, and it is the one an execution layer cannot answer for you, because only running the code produces the second half.",
            },
            {
              id: "h1",
              kind: "heading",
              level: 2,
              text: "Four failures you will meet",
            },
            {
              id: "tab1",
              kind: "table",
              columns: ["Symptom", "Where to look first"],
              rows: [
                ["Works locally, fails deployed", "Environment variables and build-time versus run-time differences"],
                ["A page loads but the data is empty", "Permissions. An access rule returning zero rows looks exactly like no data"],
                ["Correct on desktop, broken on a phone", "Fixed positioning, viewport units, and anything with a hard-coded width"],
                ["Intermittent", "Ordering. Two things racing, or a value cached from a previous run"],
              ],
            },
            {
              id: "t2",
              kind: "text",
              text: "The second row is worth memorising. A permission rule that is too strict produces an empty list, not an error — so it presents as \"the feature does not work\" rather than \"you are not allowed\", and people spend hours in the wrong file.",
            },
            {
              id: "p1",
              kind: "prompt",
              title: "Diagnose before fixing",
              prompt: "Something is broken. Do not propose a fix yet.\n\nSymptom: [what you see]\nExpected: [what should happen]\nWhat I have already checked: [list]\n\nGive me:\n1. The three most likely causes, most likely first.\n2. For each, the single cheapest thing I could check to rule it in or out.\n3. What I should print or log to find out which it is.",
              why: "Forcing a diagnosis before a fix is what stops the cycle of plausible changes to unrelated files, and the third answer usually finds it in one attempt.",
            },
          ],
        },
      ],
      mission: {
        slug: "data-and-auth",
        title: "Make it multi-user and safe",
        summary:
          "Real accounts, real ownership, and an access rule you have tried to break.",
        type: "build",
        difficulty: "advanced",
        minutes: 360,
        objective:
          "Add authentication and ownership to your product, and prove that one user cannot reach another's data.",
        whyItMatters:
          "This is the boundary that has to hold before anybody else's data is in your product. It is also the one you cannot retrofit comfortably, because every query you have already written assumes there is only one user.",
        objectives: [
          "Working sign-in, with the identity taken from the session",
          "Ownership enforced in the database, not in the interface",
          "A written record of the two-account test and its result",
        ],
        blocks: [
          {
            id: "m1",
            kind: "steps",
            title: "How to work through it",
            items: [
              "Add authentication using a provider. Do not build password handling yourself.",
              "Add an owner column to every table that holds user data, and write the access rule in the database.",
              "Remove any filtering that happens in the application and rely on the rule. If something disappears, the rule was doing its job.",
              "Run the two-account test: sign in as A, note an id, sign in as B, and request A's record directly by URL and by API.",
              "Write down what you tried and what came back.",
            ],
          },
          {
            id: "m2",
            kind: "callout",
            tone: "warning",
            title: "Do not weaken the rule to make a feature work",
            text: "When a page goes blank after you add access rules, the temptation is to loosen them until it comes back. That converts a security boundary into a suggestion. The correct move is to find out which query is being refused and why — usually it is running as the wrong identity.",
          },
          {
            id: "m3",
            kind: "checklist",
            title: "Before you submit",
            items: [
              "No user id is read from a request body or URL to decide access",
              "Every user-data table has an access rule in the database",
              "The two-account test was actually performed, not reasoned about",
              "The result of that test is written down, including anything surprising",
            ],
          },
        ],
        deliverableTitle: "Access Report",
        deliverableDescription:
          "Authentication and ownership in place, plus the two-account test you ran and what it returned.",
        requiredEvidence: ["repository", "note"],
        requiresReflection: true,
        requiresLesson: "when-it-breaks",
        skills: [
          { key: "authentication", primary: true },
          { key: "database" },
          { key: "backend" },
        ],
        toolbox: ["supabase-rls-docs", "nextjs-data-security"],
      },
    },
  ],
};
