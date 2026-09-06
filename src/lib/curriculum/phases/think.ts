import type { PhaseSpec } from "@/lib/curriculum/types";

/**
 * 01 THINK — find a problem worth solving, and decide it is yours.
 *
 * The phase exists because the most expensive mistake in software is not a bad
 * architecture, it is a well-built product nobody needed. Everything here is
 * aimed at one decision, and the phase deliberately refuses to let that
 * decision be made on taste.
 */
export const think: PhaseSpec = {
  key: "think",
  modules: [
    {
      slug: "problems-worth-solving",
      title: "Problems worth solving",
      summary:
        "How to tell a real problem from an interesting idea, before either of them costs you a month.",
      lessons: [
        {
          slug: "problems-not-features",
          title: "You are not looking for an idea",
          summary:
            "Ideas are cheap and interchangeable. Problems are specific, and they are what a product is actually built on.",
          type: "concept",
          difficulty: "foundational",
          minutes: 8,
          completion: "read",
          skills: ["problem-discovery", "critical-thinking"],
          objectives: [
            "State a problem as a person, a situation and a cost",
            "Recognise when you are describing a feature rather than a problem",
          ],
          blocks: [
            {
              id: "t1",
              kind: "text",
              text: "Most people begin with a sentence like \"an app that helps freelancers manage invoices\". That is a description of software. It says what you would build, not why anyone would change what they do today in order to use it.",
            },
            {
              id: "t2",
              kind: "text",
              text: "A problem is a different kind of sentence. It names somebody specific, describes the situation they are in, and says what that situation currently costs them. Software is one possible response to it — usually not the only one, and occasionally not the best one.",
            },
            {
              id: "c1",
              kind: "comparison",
              title: "The same starting point, said two ways",
              left: {
                label: "An idea",
                points: [
                  "An app that helps freelancers manage invoices",
                  "A better project tool for agencies",
                  "AI-powered customer support",
                ],
              },
              right: {
                label: "A problem",
                points: [
                  "Solo designers chase late payments by hand and lose about a day a month to it",
                  "Agency PMs rebuild the same status update in three places every Friday",
                  "Support leads cannot tell which of last month's tickets were the same question",
                ],
              },
            },
            {
              id: "t3",
              kind: "text",
              text: "Notice what the right-hand column gives you that the left does not. You know who to go and find. You know what to ask them. You know what would count as evidence that you are right. And you could tell, afterwards, whether your product actually helped — because you named the cost you were trying to remove.",
            },
            {
              id: "cal1",
              kind: "callout",
              tone: "why",
              title: "Why this matters",
              text: "Everything in the next nine phases depends on this sentence. Your research plan comes from the person you named. Your scope comes from the cost you named. Your pricing comes from what that cost is worth. Start with an idea and every later decision is a guess dressed up as a preference.",
            },
            {
              id: "t4",
              kind: "text",
              text: "There is a simple structural test. Take your sentence and remove the word \"app\", \"platform\", \"tool\" or \"AI\". If what remains still describes something real that somebody is struggling with, you have a problem. If what remains is nothing, you had an idea.",
            },
            {
              id: "q1",
              kind: "choice",
              question: "Which of these is a problem statement rather than an idea?",
              multiple: false,
              options: [
                { id: "a", label: "A dashboard that gives small landlords an overview of their properties" },
                { id: "b", label: "Landlords with two or three flats reconcile rent against their bank statement by hand each month, and find mistakes weeks late" },
                { id: "c", label: "An AI assistant for property management" },
                { id: "d", label: "A mobile-first rental platform" },
              ],
              correct: ["b"],
              explanation:
                "Only B names a person, a situation and a cost. The other three describe software. B also tells you what to do next: go and find somebody who owns two flats and ask how last month went.",
            },
            {
              id: "t5",
              kind: "text",
              text: "You will not have a good problem statement yet, and you are not supposed to. The next three lessons give you a way to rank the candidates you do have, and a way to find better ones. The mission at the end of this module is where you commit to one.",
            },
          ],
        },

        {
          slug: "four-questions",
          title: "The four questions that rank a problem",
          summary:
            "Frequency, pain, the cost of doing nothing, and whether anybody already pays. A problem that fails one of them is not disqualified — it is just harder.",
          type: "concept",
          difficulty: "foundational",
          minutes: 12,
          completion: "knowledge_check",
          skills: ["problem-discovery", "critical-thinking"],
          toolbox: ["problem-user-evidence"],
          requires: ["problems-not-features"],
          objectives: [
            "Rank two candidate problems against the same four questions",
            "Say which of the four a given problem is weakest on, and what that predicts",
          ],
          blocks: [
            {
              id: "t1",
              kind: "text",
              text: "You will usually have more than one candidate, and they will all feel plausible. Feeling plausible is not a signal — it only means you thought of it. These four questions are how you separate them, and each one predicts a different way the product can fail later.",
            },
            {
              id: "h1",
              kind: "heading",
              level: 2,
              text: "1. How often does it happen?",
            },
            {
              id: "t2",
              kind: "text",
              text: "A problem somebody hits daily can support a habit. A problem they hit once a year cannot — they will not remember you exist by the time it comes round again. Frequency is what determines whether you need to be remembered or merely findable.",
            },
            {
              id: "t3",
              kind: "text",
              text: "This does not rule annual problems out. Tax software is annual and enormous. But an annual product has to be found at exactly the right moment, which makes distribution the hard part, and distribution is the part a first-time founder is least equipped for.",
            },
            {
              id: "h2",
              kind: "heading",
              level: 2,
              text: "2. How much does it hurt?",
            },
            {
              id: "t4",
              kind: "text",
              text: "Pain is not the same as annoyance. The test is whether the person has already tried to fix it. Somebody who has built a spreadsheet, hired a virtual assistant, written a script, or changed how their team works has told you the pain is real — they spent something on it before you arrived.",
            },
            {
              id: "cal1",
              kind: "callout",
              tone: "tip",
              title: "The strongest signal in early research",
              text: "A broken workaround. Not \"I wish there were a tool for this\", but \"here is the spreadsheet I built, and here is the bit of it that breaks every month\". People do not build workarounds for problems they do not have.",
            },
            {
              id: "h3",
              kind: "heading",
              level: 2,
              text: "3. What does doing nothing cost?",
            },
            {
              id: "t5",
              kind: "text",
              text: "Every problem has a status quo, and the status quo is your real competitor. Sometimes it costs money. Sometimes it costs hours. Sometimes it costs risk — a mistake that has not happened yet but would be expensive when it does.",
            },
            {
              id: "t6",
              kind: "text",
              text: "If you cannot describe the cost of doing nothing, you cannot price the product, and you will struggle to explain why anyone should switch. \"It is nicer\" is not a cost.",
            },
            {
              id: "h4",
              kind: "heading",
              level: 2,
              text: "4. Does anybody already pay to make it go away?",
            },
            {
              id: "t7",
              kind: "text",
              text: "Existing spending is the cheapest evidence there is. If people already pay for a worse tool, a freelancer, an agency or an internal hire, then a budget exists and somebody has already decided this is worth money. You are arguing about which solution, not about whether the problem is real.",
            },
            {
              id: "t8",
              kind: "text",
              text: "A problem nobody pays anything for can still be a business — but you are then making two arguments at once: that the problem matters, and that yours is the answer. Two arguments is roughly four times the work.",
            },
            {
              id: "tab1",
              kind: "table",
              columns: ["Weak on", "What it predicts", "What it costs you"],
              rows: [
                ["Frequency", "People forget you between uses", "Distribution becomes the whole job"],
                ["Pain", "Nobody switches; they nod and stay", "Slow, polite failure that takes months to read"],
                ["Cost of doing nothing", "You cannot justify a price", "Free users who never convert"],
                ["Existing spend", "You must prove the problem first", "A longer, more expensive validation phase"],
              ],
            },
            {
              id: "q1",
              kind: "choice",
              question:
                "A team lead tells you their weekly report takes two hours, they have built a half-broken spreadsheet to speed it up, and they do not pay for anything today. Which of the four is this problem weakest on?",
              multiple: false,
              options: [
                { id: "a", label: "Frequency" },
                { id: "b", label: "Pain" },
                { id: "c", label: "Cost of doing nothing" },
                { id: "d", label: "Existing spend" },
              ],
              correct: ["d"],
              explanation:
                "It is weekly, so frequency is fine. The spreadsheet is a workaround, so pain is real. Two hours a week is a describable cost. Nobody pays anything today — so you will have to establish that this is a budget line, not just an irritation. That is the hard part, and it is worth knowing before you build.",
            },
            {
              id: "d1",
              kind: "decision",
              situation:
                "You have two candidates. A: a daily problem with a visible workaround, but nobody spends money on it. B: an annual problem people already pay an accountant to handle. You can only pursue one first.",
              options: [
                {
                  id: "a",
                  label: "Start with A, the daily problem",
                  tradeoff:
                    "You get fast feedback and repeated usage, which makes everything easier to learn from. But you will have to create a budget line that does not exist yet, and free-to-paid is a real cliff.",
                },
                {
                  id: "b",
                  label: "Start with B, the annual problem",
                  tradeoff:
                    "The money is already moving, so the conversation is about your solution rather than the problem. But you will get one round of real feedback a year, and being found at the right moment is now your main constraint.",
                },
                {
                  id: "c",
                  label: "I am not sure yet",
                  tradeoff:
                    "A reasonable position this early. What would settle it is not more thinking: it is five conversations with people in each group. Phase 02 is that.",
                },
              ],
              recommended: "a",
              explanation:
                "For a first product built by one person, feedback speed usually beats budget certainty. You will make dozens of small wrong decisions, and a daily problem tells you about them in days rather than in a year. But this genuinely depends on your access: if you can reach fifty accountants tomorrow and no daily users at all, B is the better bet. The tradeoff is what to reason about, not the answer.",
            },
            {
              id: "t9",
              kind: "text",
              text: "Run every candidate you have through the four questions before the next lesson. You are not looking for one that scores perfectly — those mostly do not exist, and the ones that do are crowded. You are looking for one whose weakness you are willing to spend a phase on.",
            },
          ],
        },

        {
          slug: "where-problems-come-from",
          title: "Where good problems actually come from",
          summary:
            "Four sources that reliably produce them, and why brainstorming is not one of them.",
          type: "concept",
          difficulty: "foundational",
          minutes: 9,
          completion: "read",
          skills: ["problem-discovery"],
          requires: ["problems-not-features"],
          objectives: [
            "Name the four places worth looking for a problem",
            "Explain why an idea that arrived by brainstorm is usually weaker",
          ],
          blocks: [
            {
              id: "t1",
              kind: "text",
              text: "Sitting down to think of a business almost never works, and the reason is structural rather than motivational. Brainstorming samples from what you can imagine. Problems live in what people actually do, and most of what people actually do is invisible until you go and look at it.",
            },
            {
              id: "h1",
              kind: "heading",
              level: 2,
              text: "Where you have already been",
            },
            {
              id: "t2",
              kind: "text",
              text: "Any job you have held, any hobby you have taken seriously, any community you are part of. You know the vocabulary, you know who the people are, and you can tell the difference between a complaint and a real cost. That last part takes outsiders months.",
            },
            {
              id: "t3",
              kind: "text",
              text: "Slack is the well-known version of this. It was an internal tool a team built for itself while making something else entirely, and it existed because they needed it before anyone else was offered it. The general shape — build the thing you needed, then notice that others need it too — is one of the most reliable in software.",
            },
            {
              id: "h2",
              kind: "heading",
              level: 2,
              text: "Where the workarounds are",
            },
            {
              id: "t4",
              kind: "text",
              text: "Spreadsheets doing a job they were never designed for. Zapier chains held together with hope. A shared inbox used as a database. A Notion page that four people update by hand. Every one of these is a person who has already decided the problem is worth effort.",
            },
            {
              id: "h3",
              kind: "heading",
              level: 2,
              text: "Where something has just changed",
            },
            {
              id: "t5",
              kind: "text",
              text: "A new regulation, a new platform, a price change, a capability that did not exist eighteen months ago. Change creates problems faster than incumbents can respond, and it gives you a reason to exist that is not \"we are nicer\".",
            },
            {
              id: "cal1",
              kind: "callout",
              tone: "note",
              title: "The obvious current example",
              text: "The cost of building software has fallen sharply. That means categories which were previously too small to serve — too few customers, too specific a workflow — are now reachable by one person. Small and specific is no longer a disqualifier. It may be the opportunity.",
            },
            {
              id: "h4",
              kind: "heading",
              level: 2,
              text: "Where people are angry in public",
            },
            {
              id: "t6",
              kind: "text",
              text: "Support forums, one-star reviews, subreddits for a profession, the replies under a product's announcement. Read for the specific complaint rather than the general mood. \"Their reporting is unusable if you have more than one site\" is a problem. \"Their pricing is greedy\" is a feeling.",
            },
            {
              id: "ex1",
              kind: "expandable",
              summary: "What to do with a complaint you find in public",
              text: "Do not build from it directly — you have one person's opinion and no context. Use it as an entry point: find three more people in the same situation and ask them to describe last month. If the complaint is real, it will come up unprompted. If it does not, you have learned something cheaply.",
            },
            {
              id: "t7",
              kind: "text",
              text: "One warning about all four. A problem you find is not yet a problem you should build on. It is a candidate to take into a conversation. The whole of Phase 02 exists because the gap between \"somebody said this\" and \"this is true and worth money\" is where most first products die.",
            },
          ],
        },

        {
          slug: "three-ideas-teardown",
          title: "Three ideas, one worth building",
          summary:
            "The four questions applied to three realistic candidates, with the reasoning shown.",
          type: "teardown",
          difficulty: "foundational",
          minutes: 10,
          completion: "read",
          skills: ["critical-thinking", "problem-discovery"],
          toolbox: ["pressure-test-an-idea"],
          requires: ["four-questions"],
          objectives: [
            "Apply the four questions to a candidate you did not invent",
            "Explain why the most exciting-sounding idea is often the weakest",
          ],
          blocks: [
            {
              id: "t1",
              kind: "text",
              text: "Three candidates, all of which a reasonable person could take seriously. Read each one and decide what you think before the analysis. The point is not which answer is right — it is watching the four questions do work.",
            },
            {
              id: "h1",
              kind: "heading",
              level: 2,
              text: "A. An AI assistant for small law firms",
            },
            {
              id: "t2",
              kind: "text",
              text: "The pitch: small firms drown in document work, and a model can draft. It sounds large, current and lucrative.",
            },
            {
              id: "t3",
              kind: "text",
              text: "Frequency: high. Pain: high. Cost of doing nothing: paralegal hours, which are expensive. Existing spend: substantial, on people and on practice-management software. On the four questions this looks excellent.",
            },
            {
              id: "cal1",
              kind: "callout",
              tone: "warning",
              title: "What the four questions do not catch",
              text: "A problem can pass every test and still be the wrong first product. Here the obstacles are not demand: they are liability, confidentiality, procurement, and the fact that a wrong answer has legal consequences. A first product built by one person cannot carry that. The four questions rank problems; they do not tell you whether you can survive the category.",
            },
            {
              id: "h2",
              kind: "heading",
              level: 2,
              text: "B. A tool that turns podcast episodes into social posts",
            },
            {
              id: "t4",
              kind: "text",
              text: "The pitch: podcasters want clips and quotes, and doing it by hand is tedious.",
            },
            {
              id: "t5",
              kind: "text",
              text: "Frequency: weekly, which is good. Pain: moderate — tedious rather than costly. Cost of doing nothing: an hour of editing, or nothing at all, because plenty of podcasters simply skip it. Existing spend: some, and there are many products already.",
            },
            {
              id: "t6",
              kind: "text",
              text: "This is the most common shape of a weak candidate: nothing about it is wrong, and nothing about it is compelling. The cost of doing nothing is \"I do not bother\", and a product whose competitor is not bothering has to be excellent to win.",
            },
            {
              id: "h3",
              kind: "heading",
              level: 2,
              text: "C. Rent reconciliation for landlords with two to five flats",
            },
            {
              id: "t7",
              kind: "text",
              text: "The pitch: small landlords match rent against a bank statement by hand each month, and errors surface weeks later.",
            },
            {
              id: "t8",
              kind: "text",
              text: "Frequency: monthly. Pain: real, and it shows up as a spreadsheet almost every time. Cost of doing nothing: an evening a month plus the occasional missed payment, which is money. Existing spend: mostly nothing, or property software priced for portfolios of fifty.",
            },
            {
              id: "t9",
              kind: "text",
              text: "It is the least exciting of the three and the best first candidate. The user is reachable, the workflow is narrow enough to build in weeks, the failure is measurable, and the incumbents have deliberately priced this person out. Its weakness — nobody at this size pays today — is a known, single, testable risk rather than a fog.",
            },
            {
              id: "q1",
              kind: "choice",
              question: "What makes C a better first product than A, despite A scoring higher on the four questions?",
              multiple: false,
              options: [
                { id: "a", label: "C has less competition" },
                { id: "b", label: "C is narrow enough for one person to build and carries no liability that would sink them" },
                { id: "c", label: "C is a bigger market" },
                { id: "d", label: "C is more technically interesting" },
              ],
              correct: ["b"],
              explanation:
                "Ranking a problem and choosing a first product are two different decisions. A is a better problem and a worse first move: it needs credibility, compliance and a sales motion you do not have yet. C is buildable, reachable and survivable — and it has exactly one big unknown, which is the kind of risk you can actually go and test.",
            },
            {
              id: "cal2",
              kind: "callout",
              tone: "real_world",
              title: "Take this into your own list",
              text: "For each candidate you are holding, write the four answers and then one more line: what would have to be true about me, not about the market, for this to work. Access to the people, tolerance for the category, ability to build it alone. That line disqualifies more ideas than the four questions do.",
            },
          ],
        },
      ],

      mission: {
        slug: "find-the-problem",
        title: "Find the problem worth solving",
        summary:
          "Leave with three candidate problems, ranked, and one you are prepared to defend.",
        type: "research",
        difficulty: "foundational",
        minutes: 90,
        objective:
          "Produce three real candidate problems, rank them against the four questions, and pick one to carry into Research.",
        whyItMatters:
          "Every decision in the next nine phases inherits this one. A vague problem produces a vague product, and you will not find out for months. An hour and a half here is the cheapest work in the whole programme.",
        objectives: [
          "Three candidates written as person, situation and cost",
          "Each ranked against frequency, pain, cost of doing nothing and existing spend",
          "One chosen, with the reason and the biggest unknown stated",
        ],
        blocks: [
          {
            id: "m1",
            kind: "text",
            text: "You are not choosing what to build. You are choosing what to investigate. The difference matters: a candidate you pick here can be abandoned in Phase 02 on evidence, and that will be a success rather than a failure.",
          },
          {
            id: "m2",
            kind: "steps",
            title: "How to work through it",
            items: [
              "Spend twenty minutes on each of the four sources from the lesson. Write down everything, including the weak ones.",
              "Cut to three candidates. Rewrite each as a person, a situation and a cost — the sentence should name somebody you could go and find this week.",
              "Answer the four questions for each. Where you do not know, write \"unknown\" rather than guessing; unknowns are the map for Phase 02.",
              "Pick one. Write two sentences on why, and one sentence naming the single biggest thing that would have to be true for it to work.",
            ],
          },
          {
            id: "m3",
            kind: "callout",
            tone: "tip",
            title: "If every candidate feels weak",
            text: "That is normal and it is usually a sourcing problem rather than a judgement problem. Go back to the workarounds: open your own browser history, your own spreadsheets, the tools your last workplace used badly. Weak candidates are almost always a sign of looking in your imagination rather than at somebody's screen.",
          },
          {
            id: "m4",
            kind: "checklist",
            title: "Before you submit",
            items: [
              "Each candidate names a specific person, not a segment",
              "Each cost is measurable — hours, money, or a risk you could describe",
              "Unknowns are marked as unknown rather than filled in with a guess",
              "Your chosen candidate has one clearly stated biggest unknown",
            ],
          },
        ],
        deliverableTitle: "Idea Brief",
        deliverableDescription:
          "Three ranked candidate problems and the one you are taking into Research, with its biggest unknown named.",
        requiredEvidence: ["document"],
        requiresReflection: true,
        requiresLesson: "three-ideas-teardown",
        skills: [
          { key: "problem-discovery", primary: true },
          { key: "critical-thinking" },
        ],
        toolbox: ["idea-brief", "pressure-test-an-idea", "problem-user-evidence"],
      },
    },

    {
      slug: "choosing-yours",
      title: "Choosing the one that is yours",
      summary:
        "Founder–problem fit, honest scoping, and a problem statement you could defend to a sceptic.",
      lessons: [
        {
          slug: "founder-problem-fit",
          title: "Founder–problem fit",
          summary:
            "Why the same problem is a good bet for one person and a bad bet for another.",
          type: "concept",
          difficulty: "foundational",
          minutes: 8,
          completion: "read",
          skills: ["critical-thinking", "problem-discovery"],
          objectives: [
            "Assess a candidate against your own access, tolerance and interest",
            "Say what unfair advantage you actually have, or admit you have none yet",
          ],
          blocks: [
            {
              id: "t1",
              kind: "text",
              text: "Two people can hold the same candidate and have completely different odds. That is not about talent. It is about three things you either have or do not, and they are worth being honest about now rather than discovering in month four.",
            },
            {
              id: "h1",
              kind: "heading",
              level: 2,
              text: "Access",
            },
            {
              id: "t2",
              kind: "text",
              text: "Can you get in front of ten of these people in the next fortnight? Not a mailing list, not a cold outreach campaign — actual conversations. If yes, your research phase costs days. If no, it costs weeks and a lot of unanswered messages, and every later phase inherits that.",
            },
            {
              id: "t3",
              kind: "text",
              text: "This is the single strongest predictor of whether a first product gets anywhere, and it is almost always underweighted, because it feels like an accident of biography rather than a skill.",
            },
            {
              id: "h2",
              kind: "heading",
              level: 2,
              text: "Tolerance",
            },
            {
              id: "t4",
              kind: "text",
              text: "Every category has a tax. Healthcare has compliance. Finance has regulation and fraud. Education has procurement cycles that outlast enthusiasm. Consumer has churn. Ask what the tax is here and whether you are willing to pay it for two years.",
            },
            {
              id: "h3",
              kind: "heading",
              level: 2,
              text: "Interest that survives boredom",
            },
            {
              id: "t5",
              kind: "text",
              text: "Not passion. Passion is loud and short. The question is whether you would still read about this in month six, when the novelty has gone and the work is fixing a date-parsing bug for the fourth time. Most abandoned products are abandoned in month three, and boredom is the usual cause.",
            },
            {
              id: "d1",
              kind: "decision",
              situation:
                "Your best candidate on the four questions is in an industry you have no connection to. Your second-best is one you worked in for three years and know dozens of people in.",
              options: [
                {
                  id: "a",
                  label: "Take the stronger problem and build access from scratch",
                  tradeoff:
                    "Better long-term market, but you add two to six weeks before you learn anything, and every conversation is cold. Some people are very good at this. Most first-time founders are not, and stall here.",
                },
                {
                  id: "b",
                  label: "Take the second-best problem where you already have access",
                  tradeoff:
                    "You will be learning inside a week rather than inside a month. The ceiling may genuinely be lower — and a lower ceiling you actually reach beats a higher one you never test.",
                },
                {
                  id: "c",
                  label: "I am not sure yet",
                  tradeoff:
                    "Then answer one question first: could you get three conversations in the harder market this week? Try it before deciding. The attempt costs an afternoon and settles the argument with evidence.",
                },
              ],
              recommended: "b",
              explanation:
                "For a first product, speed of learning dominates almost everything else. Access converts directly into learning speed. This is genuinely a judgement call — if the gap between the two problems is enormous, option A can be right — but the common error is overrating the market and underrating the fact that you cannot reach it.",
            },
            {
              id: "t6",
              kind: "text",
              text: "Write the honest version for your chosen candidate. If the answer is that you have no access, no particular tolerance and no durable interest, that is worth knowing today. It does not mean stop. It means your first job is to build access, and to plan for that rather than pretend it is free.",
            },
          ],
        },

        {
          slug: "scoping-to-one-person",
          title: "Scoping to something one person can finish",
          summary:
            "The difference between a first version and a small version of the eventual product.",
          type: "decision",
          difficulty: "foundational",
          minutes: 10,
          completion: "read",
          skills: ["scoping", "product-thinking"],
          objectives: [
            "Cut a product idea to the one workflow that carries the value",
            "Recognise the scope creep that arrives disguised as completeness",
          ],
          blocks: [
            {
              id: "t1",
              kind: "text",
              text: "A first version is not a smaller version of the product you imagine. It is the one path through it that delivers the value, with everything else deliberately absent. Those are different objects and they get built differently.",
            },
            {
              id: "t2",
              kind: "text",
              text: "The test is uncomfortable and useful: name the single sequence of actions that, if it worked and nothing else did, would make one real person better off. That sequence is your first version. Everything you were about to add around it is the second.",
            },
            {
              id: "c1",
              kind: "comparison",
              title: "The rent reconciliation example, scoped two ways",
              left: {
                label: "A small version of the whole product",
                points: [
                  "Property and tenant management",
                  "Bank connection with automatic sync",
                  "Payment matching",
                  "Reminders and templated chasers",
                  "Reports and exports",
                  "Multi-user access",
                ],
              },
              right: {
                label: "The one path that carries the value",
                points: [
                  "Upload a bank statement CSV",
                  "Match transactions to expected rent",
                  "Show what is missing this month",
                ],
              },
            },
            {
              id: "t3",
              kind: "text",
              text: "The left-hand column is four months and eleven ways to be wrong. The right-hand column is a fortnight and answers the only question that matters: does seeing what is missing, in one place, change anything for this person? If it does not, none of the six features on the left would have saved it.",
            },
            {
              id: "cal1",
              kind: "callout",
              tone: "why",
              title: "Why this matters more with AI than it did before",
              text: "When building was slow, scope was disciplined by exhaustion. Now you can generate a settings page, an onboarding flow and an admin panel in an afternoon — which means nothing stops you building all of it before you have learned anything. Cheap building makes scope discipline more important, not less.",
            },
            {
              id: "t4",
              kind: "text",
              text: "Three kinds of work reliably arrive disguised as necessary. Accounts and authentication before anyone has asked for an account. Settings for preferences nobody has expressed. Admin tooling for a volume of data you do not have. Each is defensible in isolation and each is a week you spent not learning.",
            },
            {
              id: "q1",
              kind: "choice",
              question:
                "Your one path is: upload a statement, match it, see what is missing. Which of these genuinely belongs in the first version?",
              multiple: false,
              options: [
                { id: "a", label: "Sign-up with email verification, so the data is saved between visits" },
                { id: "b", label: "A settings page for date and currency format" },
                { id: "c", label: "Whatever is required for one real landlord to run their own statement through it once" },
                { id: "d", label: "An admin dashboard so you can see who is using it" },
              ],
              correct: ["c"],
              explanation:
                "C is the actual bar, and it is deliberately awkward — it may mean you run the statement for them, on your own machine, with no accounts at all. That still answers the question. A, B and D are all reasonable later and all of them delay the only thing you need this month, which is one person's reaction.",
            },
            {
              id: "t5",
              kind: "text",
              text: "You will define the real scope in Phase 04, once you have evidence. For now, hold a one-sentence version of the path in your head. It is what stops Research turning into a wish list.",
            },
          ],
        },

        {
          slug: "problem-statement",
          title: "A problem statement you could defend",
          summary:
            "One sentence, four constraints, and a sceptic on the other side of the table.",
          type: "workshop",
          difficulty: "foundational",
          minutes: 12,
          completion: "knowledge_check",
          skills: ["problem-discovery", "writing"],
          toolbox: ["idea-brief"],
          requires: ["founder-problem-fit"],
          objectives: [
            "Write a problem statement that names person, situation, cost and evidence",
            "Identify the weakest word in your own statement",
          ],
          blocks: [
            {
              id: "t1",
              kind: "text",
              text: "You are going to write one sentence, and then attack it. The sentence is what you will carry into every conversation in Phase 02, and its weakest word is what those conversations should be aimed at.",
            },
            {
              id: "h1",
              kind: "heading",
              level: 2,
              text: "The shape",
            },
            {
              id: "code1",
              kind: "code",
              language: "text",
              filename: "problem-statement.txt",
              code: "[Specific person] currently [what they do today],\nwhich costs them [measurable cost],\nand I believe this because [what you have actually observed].",
            },
            {
              id: "t2",
              kind: "text",
              text: "The fourth clause is the one people skip, and it is the one that keeps you honest. If the only thing you can write there is \"it seems obvious\", you have a hypothesis rather than a problem, and Phase 02 is about to be very useful to you.",
            },
            {
              id: "h2",
              kind: "heading",
              level: 2,
              text: "A weak one, improved",
            },
            {
              id: "c1",
              kind: "comparison",
              title: "Same problem, two statements",
              left: {
                label: "Weak",
                points: [
                  "Small landlords struggle to keep track of rent payments and waste a lot of time on admin.",
                  "\"Struggle\", \"a lot\" and \"admin\" cannot be tested",
                  "No person you could go and find",
                  "No evidence clause at all",
                ],
              },
              right: {
                label: "Defensible",
                points: [
                  "Landlords with two to five flats reconcile rent against a bank statement by hand each month, which takes an evening and lets a missed payment go unnoticed for weeks — I have watched two of them do it and both keep a spreadsheet for it.",
                  "Names who, what, how long, and what goes wrong",
                  "You could find this person on a forum this afternoon",
                  "The evidence is an observation, not an opinion",
                ],
              },
            },
            {
              id: "h3",
              kind: "heading",
              level: 2,
              text: "Now attack it",
            },
            {
              id: "t3",
              kind: "text",
              text: "Read your sentence as a sceptic whose job is to stop you wasting a year. Three questions: which word is doing work it has not earned; how many people have you actually seen do this; and what would the world look like if this were false?",
            },
            {
              id: "cal1",
              kind: "callout",
              tone: "tip",
              title: "Use the execution layer against yourself",
              text: "Paste your statement into Claude and ask it to argue that the problem is not real — that people are fine with the status quo, that the cost is overstated, that anyone who cared already solved it. An AI that agrees with you is worth nothing at this stage. Ask for the strongest case against, and see which parts you cannot answer. Those are your interview questions.",
            },
            {
              id: "q1",
              kind: "choice",
              question: "Which clause of a problem statement is most often missing, and most costly to omit?",
              multiple: false,
              options: [
                { id: "a", label: "The specific person" },
                { id: "b", label: "The measurable cost" },
                { id: "c", label: "The evidence — what you have actually observed" },
                { id: "d", label: "What they do today" },
              ],
              correct: ["c"],
              explanation:
                "All four matter, but the evidence clause is the one that separates a belief from a finding. Without it a statement can be entirely specific, entirely measurable and entirely invented — which is the most dangerous kind, because it reads like research.",
            },
            {
              id: "r1",
              kind: "reflection",
              prompt:
                "Which word in your own statement is doing work it has not earned yet? Write it down. This is optional and it is not stored anywhere but here — but naming it now is what makes Phase 02 aimed rather than general.",
            },
          ],
        },
      ],

      mission: {
        slug: "commit-to-a-problem",
        title: "Commit to one problem",
        summary:
          "Write the statement you will defend, and name what would change your mind.",
        type: "writing",
        difficulty: "foundational",
        minutes: 45,
        objective:
          "Produce the problem statement that the rest of the programme is built on, together with the evidence that would falsify it.",
        whyItMatters:
          "Committing in writing is what makes the next phase falsifiable. A statement you can be wrong about is a statement research can improve; a vague direction can only be reinterpreted.",
        objectives: [
          "One problem statement with all four clauses",
          "The single biggest assumption inside it, named",
          "What you would have to hear, from whom, to abandon it",
        ],
        blocks: [
          {
            id: "m1",
            kind: "text",
            text: "This is short on purpose. The output is a paragraph. The work is in being specific enough that somebody else could disagree with you.",
          },
          {
            id: "m2",
            kind: "steps",
            title: "How to work through it",
            items: [
              "Write the statement using the four-clause shape from the lesson.",
              "Underline the assumption the whole thing rests on — the one that, if false, makes everything after it pointless.",
              "Write the falsification line: \"I would abandon this if I spoke to N people like X and heard Y.\" Make N and Y specific.",
              "Write your founder–problem fit in three lines: access, tolerance, durable interest. Be honest; nobody is scoring it.",
            ],
          },
          {
            id: "m3",
            kind: "callout",
            tone: "real_world",
            title: "This is the document you will be glad you wrote",
            text: "In Phase 03 you will hold evidence against this statement and decide whether it survived. Founders who skip this step almost always conclude their evidence supports them, because there was nothing precise enough to contradict.",
          },
          {
            id: "m4",
            kind: "checklist",
            title: "Before you submit",
            items: [
              "The person is specific enough that you could name three of them",
              "The cost is in hours, money or a describable risk",
              "The evidence clause says what you observed, not what you assume",
              "The falsification line contains a number and a specific thing you would hear",
            ],
          },
        ],
        deliverableTitle: "Problem Statement",
        deliverableDescription:
          "The problem you are taking into Research, its central assumption, and what would make you abandon it.",
        requiredEvidence: ["document"],
        requiresReflection: true,
        requiresLesson: "problem-statement",
        skills: [
          { key: "problem-discovery", primary: true },
          { key: "writing" },
          { key: "critical-thinking" },
        ],
        toolbox: ["idea-brief", "problem-user-evidence"],
      },
    },
  ],
};
