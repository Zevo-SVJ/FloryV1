import type { PhaseSpec } from "@/lib/curriculum/types";

/**
 * 02 RESEARCH — learn the market, the alternatives and the people in it.
 *
 * The phase turns a statement into knowledge. Its whole argument is that you
 * cannot reason your way to this: you have to go and hear people describe what
 * they actually did, in the past tense, about a specific occasion.
 */
export const research: PhaseSpec = {
  key: "research",
  modules: [
    {
      slug: "talking-to-people",
      title: "Talking to people who have the problem",
      summary:
        "How to run a conversation that produces facts instead of encouragement.",
      lessons: [
        {
          slug: "why-interviews-mislead",
          title: "Why most user interviews lie to you",
          summary:
            "People are kind, they are bad at predicting themselves, and both of those will confirm whatever you already believe.",
          type: "concept",
          difficulty: "foundational",
          minutes: 9,
          completion: "read",
          skills: ["market-research", "critical-thinking"],
          toolbox: ["mom-test"],
          objectives: [
            "Explain the two forces that make interview answers unreliable",
            "Spot a question that cannot produce a useful answer",
          ],
          blocks: [
            {
              id: "t1",
              kind: "text",
              text: "You will come back from your first five conversations convinced you were right. That feeling is not evidence, and it is produced almost mechanically by two things.",
            },
            {
              id: "h1",
              kind: "heading",
              level: 2,
              text: "People are kind",
            },
            {
              id: "t2",
              kind: "text",
              text: "You are visibly invested. They can tell. Saying \"that sounds useful\" costs them nothing and ends the awkwardness, so they say it. Almost nobody will tell a stranger that their idea is bad, and the ones who would are not the ones who agreed to a call.",
            },
            {
              id: "h2",
              kind: "heading",
              level: 2,
              text: "People are bad at predicting themselves",
            },
            {
              id: "t3",
              kind: "text",
              text: "\"Would you use this?\" and \"Would you pay for this?\" ask somebody to simulate a future version of themselves with different priorities and a different week. Everybody says yes to a hypothetical. The same person will not open the email six weeks later, and they are not lying — they genuinely believed it.",
            },
            {
              id: "cal1",
              kind: "callout",
              tone: "why",
              title: "The rule that fixes both",
              text: "Ask about the past, in specifics. What happened last month is a fact they can report. What they would do next month is a story they are inventing while you watch.",
            },
            {
              id: "c1",
              kind: "comparison",
              title: "The same subject, two ways",
              left: {
                label: "Produces encouragement",
                points: [
                  "Would you use a tool that reconciled rent automatically?",
                  "Is this a big problem for you?",
                  "Would you pay £15 a month for it?",
                  "Do you think other landlords would want this?",
                ],
              },
              right: {
                label: "Produces facts",
                points: [
                  "Walk me through what you did at the end of last month.",
                  "When did you last notice a payment was missing? How did you find out?",
                  "What do you spend on this today — tools, an accountant, your own evenings?",
                  "What did you try before the spreadsheet?",
                ],
              },
            },
            {
              id: "t4",
              kind: "text",
              text: "The right-hand column has a property the left does not: the answers can surprise you. If a question cannot return an answer that would make you change your plans, it is not a research question, it is reassurance with a question mark on the end.",
            },
            {
              id: "q1",
              kind: "choice",
              question: "Which question is most likely to produce a fact rather than a prediction?",
              multiple: false,
              options: [
                { id: "a", label: "Would this save you time?" },
                { id: "b", label: "How much would you pay for something like this?" },
                { id: "c", label: "What did you do the last time a tenant paid late?" },
                { id: "d", label: "Do you think this is a good idea?" },
              ],
              correct: ["c"],
              explanation:
                "C asks about a specific past event, so the answer is reportable rather than imagined — and it can surprise you. A, B and D all invite a polite hypothetical, and all three will make you feel better without teaching you anything.",
            },
            {
              id: "t5",
              kind: "text",
              text: "One more trap, because it is the most expensive. Do not describe your idea in the first ten minutes. The moment you do, the conversation stops being about their life and becomes about your plan, and everything after that is coloured by wanting to be encouraging.",
            },
          ],
        },
        {
          slug: "running-the-conversation",
          title: "Running the conversation",
          summary:
            "Finding people, opening well, following the specific, and knowing when you have learned something.",
          type: "workshop",
          difficulty: "foundational",
          minutes: 12,
          completion: "read",
          skills: ["market-research"],
          toolbox: ["interview-without-leading", "mom-test"],
          requires: ["why-interviews-mislead"],
          objectives: [
            "Run a thirty-minute conversation without pitching",
            "Follow a specific story rather than a script",
          ],
          blocks: [
            {
              id: "h1",
              kind: "heading",
              level: 2,
              text: "Finding five people",
            },
            {
              id: "t1",
              kind: "text",
              text: "Five is the number that matters. Not because five is statistically meaningful — it is not — but because by the fifth conversation you will start hearing the same sentence for the third time, and that repetition is the first real signal you get.",
            },
            {
              id: "t2",
              kind: "text",
              text: "Go where the person already is: the forum where they complain, the subreddit for their profession, the Slack or Discord for their trade, the two people you already know who fit and the three they can introduce you to. Cold outreach works too, and it is slower.",
            },
            {
              id: "cal1",
              kind: "callout",
              tone: "tip",
              title: "What to say when you ask",
              text: "Not \"can I show you my idea\". Say you are researching how people handle a specific thing, name it, and ask for twenty minutes to hear how they do it. That request is easy to say yes to, and it is also true.",
            },
            {
              id: "h2",
              kind: "heading",
              level: 2,
              text: "The shape of thirty minutes",
            },
            {
              id: "s1",
              kind: "steps",
              title: "A structure that survives contact",
              items: [
                "Two minutes: who you are, that you are researching not selling, and that there is nothing to buy.",
                "Five minutes: their situation. How many flats, how long, how it is set up today.",
                "Fifteen minutes: the last time it happened. Walk me through it. What did you do first? Then what? What went wrong?",
                "Five minutes: what they have already tried, and what they spend today — tools, people, hours.",
                "Three minutes: who else should I talk to? This is how five conversations become twelve.",
              ],
            },
            {
              id: "t3",
              kind: "text",
              text: "The middle fifteen minutes is where everything useful happens, and the skill is entirely in following. When somebody says \"and then I usually just sort it manually\", the word doing the work is \"usually\". Ask what happens when they do not.",
            },
            {
              id: "h3",
              kind: "heading",
              level: 2,
              text: "Three phrases to chase",
            },
            {
              id: "tab1",
              kind: "table",
              columns: ["When you hear", "It probably means", "Ask"],
              rows: [
                ["\"I just...\"", "A workaround they have stopped noticing", "Show me how you do that"],
                ["\"It's fine, really\"", "Resignation, not satisfaction", "What would have to change for it not to be fine?"],
                ["\"We tried X but...\"", "A failed solution and its exact failure", "What made you stop using it?"],
              ],
            },
            {
              id: "cal2",
              kind: "callout",
              tone: "warning",
              title: "The most common failure",
              text: "Talking too much. If you did more than a quarter of the talking, you ran a pitch and recorded it as research. Watch the clock or record the call and check afterwards — almost everybody is shocked the first time.",
            },
            {
              id: "h4",
              kind: "heading",
              level: 2,
              text: "Writing it up",
            },
            {
              id: "t4",
              kind: "text",
              text: "Within an hour, while it is fresh. Quotes verbatim where you can — a real sentence in their words is worth ten of your summaries, and you will want it in Phase 04 when you are arguing with yourself about scope. Note what surprised you separately; surprise is the part with information in it.",
            },
            {
              id: "p1",
              kind: "prompt",
              title: "Turn notes into questions for the next call",
              prompt: "Here are my notes from three conversations about [problem].\n\nDo not summarise them. Instead:\n1. List the claims I appear to be treating as established that are actually supported by only one person.\n2. List the contradictions between the three.\n3. Give me five questions for the next conversation that would resolve the contradictions, none of which mention my idea.",
              why: "An execution layer is good at finding the places where you have generalised from one person, which is the mistake nobody catches in their own notes.",
            },
          ],
        },
        {
          slug: "reading-what-you-heard",
          title: "Reading what you heard",
          summary:
            "Separating the signal from the politeness, and deciding what you now believe.",
          type: "concept",
          difficulty: "intermediate",
          minutes: 10,
          completion: "knowledge_check",
          skills: ["market-research", "critical-thinking"],
          requires: ["running-the-conversation"],
          objectives: [
            "Distinguish a fact, a preference and a courtesy in interview notes",
            "State what changed in your understanding, in one sentence",
          ],
          blocks: [
            {
              id: "t1",
              kind: "text",
              text: "You now have five conversations and a mess. The temptation is to summarise them into a paragraph that agrees with what you already thought. Sort them first.",
            },
            {
              id: "t2",
              kind: "text",
              text: "Every line in your notes is one of three things. A fact: something that happened, with a time and a consequence. A preference: what they say they want. A courtesy: an encouraging noise. Only the first is evidence. The second is a hypothesis about the third phase. The third is nothing.",
            },
            {
              id: "tab1",
              kind: "table",
              columns: ["What they said", "Which kind", "What you can do with it"],
              rows: [
                ["\"Last month I found out three weeks late\"", "Fact", "This is the cost. Build on it."],
                ["\"I'd love something that just tells me\"", "Preference", "A hypothesis for Phase 03 to test."],
                ["\"Yeah, that sounds really useful\"", "Courtesy", "Nothing. Do not count it."],
                ["\"I pay my accountant an extra hour for this\"", "Fact, and a price", "Existing spend. The strongest single line you can get."],
              ],
            },
            {
              id: "cal1",
              kind: "callout",
              tone: "warning",
              title: "The number that fools everybody",
              text: "\"Four out of five said they would use it.\" That is four courtesies and one preference. It is not four-fifths of anything. Count facts, and count how many different people independently produced the same one.",
            },
            {
              id: "t3",
              kind: "text",
              text: "Then look for the thing you did not expect. Almost every useful research phase produces one sentence that was not in your plan — a step you did not know existed, a person who actually makes the decision, a reason the obvious solution has already failed. That sentence is usually worth more than the four confirmations.",
            },
            {
              id: "q1",
              kind: "choice",
              question:
                "Three of five people independently mentioned they check their bank app on the last day of the month, before you asked about it. What is that?",
              multiple: false,
              options: [
                { id: "a", label: "A courtesy — they were being helpful" },
                { id: "b", label: "A preference — it is what they would like to do" },
                { id: "c", label: "A fact, repeated independently, which is the strongest thing research produces" },
                { id: "d", label: "Not relevant unless they said they would pay" },
              ],
              correct: ["c"],
              explanation:
                "Unprompted repetition across independent people is as close to a finding as five conversations get. It also tells you when your product would be used, which is the kind of detail that shapes scope in Phase 04 and that you would never have guessed.",
            },
            {
              id: "r1",
              kind: "reflection",
              prompt:
                "In one sentence: what do you now believe that you did not believe a week ago? If the honest answer is \"nothing\", that is worth knowing — it usually means the conversations were pitches. Optional, and not graded.",
            },
          ],
        },
      ],
      mission: {
        slug: "five-conversations",
        title: "Run five real conversations",
        summary:
          "Five people who have the problem, thirty minutes each, no pitching.",
        type: "research",
        difficulty: "foundational",
        minutes: 240,
        objective:
          "Talk to five people who actually have the problem, and write up what you learned as facts rather than encouragement.",
        whyItMatters:
          "This is the single highest-value thing you will do in the whole programme. Everything downstream — scope, design, pricing, the words on your landing page — is either grounded in these conversations or invented.",
        objectives: [
          "Five written conversation notes with verbatim quotes",
          "The facts separated from the preferences and the courtesies",
          "One sentence on what changed in your understanding",
        ],
        blocks: [
          {
            id: "m1",
            kind: "text",
            text: "This mission takes days rather than hours, and most of that is waiting for replies. Start the outreach today, and use the waiting to prepare.",
          },
          {
            id: "m2",
            kind: "steps",
            title: "How to work through it",
            items: [
              "Write down where these people are. Pick the three most likely places and ask ten people; five will say yes.",
              "Run each conversation using the thirty-minute shape. Do not describe your idea in the first ten minutes.",
              "Write each up within the hour, with at least two verbatim quotes.",
              "Sort every line into fact, preference or courtesy.",
              "Write the one sentence: what you now believe that you did not before.",
            ],
          },
          {
            id: "m3",
            kind: "callout",
            tone: "tip",
            title: "If people will not reply",
            text: "That is information, not a blocker. Either you are asking in the wrong place, or the request sounds like sales. Change one variable at a time and try again. If ten attempts across three channels produce nothing, your access problem is the real finding, and it belongs in your notes.",
          },
          {
            id: "m4",
            kind: "checklist",
            title: "Before you submit",
            items: [
              "Five different people, all of whom actually have the problem",
              "At least two verbatim quotes per conversation",
              "Every line sorted into fact, preference or courtesy",
              "One surprise recorded — something you did not expect to hear",
            ],
          },
        ],
        deliverableTitle: "Conversation Notes",
        deliverableDescription:
          "Five write-ups, sorted into facts, preferences and courtesies, with the one thing that changed your mind.",
        requiredEvidence: ["document"],
        requiresReflection: true,
        requiresLesson: "reading-what-you-heard",
        skills: [
          { key: "market-research", primary: true },
          { key: "problem-discovery" },
        ],
        toolbox: ["interview-without-leading", "mom-test", "problem-user-evidence"],
      },
    },

    {
      slug: "the-alternatives",
      title: "The alternatives they already use",
      summary:
        "Mapping what people do today — including the tools that are not products.",
      lessons: [
        {
          slug: "your-real-competitor",
          title: "Your real competitor is a spreadsheet",
          summary:
            "Why the incumbent to beat is usually the status quo, and how to map it honestly.",
          type: "concept",
          difficulty: "foundational",
          minutes: 9,
          completion: "read",
          skills: ["market-research", "product-thinking"],
          objectives: [
            "List the four kinds of alternative any problem already has",
            "Say what a switch would actually cost your user",
          ],
          blocks: [
            {
              id: "t1",
              kind: "text",
              text: "Founders map competitors by listing companies. That misses the alternative that actually wins most of the time, which is a spreadsheet, a shared inbox, or an evening every month and a shrug.",
            },
            {
              id: "t2",
              kind: "text",
              text: "Every problem already has four kinds of answer, and you are competing with all four.",
            },
            {
              id: "s1",
              kind: "steps",
              title: "The four alternatives",
              items: [
                "Doing nothing — living with the cost. Free, familiar, and undefeated in most categories.",
                "Doing it by hand — the spreadsheet, the manual process, the checklist in a notebook.",
                "Paying a person — an accountant, a VA, an agency, a colleague whose job absorbed it.",
                "Paying for software — the direct competitors, which is the only column most founders write down.",
              ],
            },
            {
              id: "cal1",
              kind: "callout",
              tone: "why",
              title: "Why the first two matter most",
              text: "Doing nothing and doing it by hand are free and already installed. Beating a paid competitor means being better. Beating a spreadsheet means being enough better to justify learning something new, moving data, and trusting you — which is a much higher bar than it sounds.",
            },
            {
              id: "h1",
              kind: "heading",
              level: 2,
              text: "The cost of switching",
            },
            {
              id: "t3",
              kind: "text",
              text: "Write down, specifically, what a person would have to do to move from their alternative to yours. Export something? Re-enter a year of history? Change what they tell a colleague? Trust a stranger with financial data? Each item is friction you must either remove or be worth.",
            },
            {
              id: "t4",
              kind: "text",
              text: "This is where most \"we are just better\" products die. Better is not a switching argument. A switching argument sounds like: it takes four minutes to set up, it imports the file you already have, and it does the one thing your spreadsheet gets wrong.",
            },
            {
              id: "d1",
              kind: "decision",
              situation:
                "Your research shows the dominant alternative is a spreadsheet people have used for years and largely trust.",
              options: [
                {
                  id: "a",
                  label: "Replace the spreadsheet entirely",
                  tradeoff:
                    "Cleaner product and a bigger prize, but you inherit every edge case they have added over years, and the switching cost is enormous. Many people will simply not move.",
                },
                {
                  id: "b",
                  label: "Take the file the spreadsheet produces and do the one thing it does badly",
                  tradeoff:
                    "Much smaller product and a much lower switching cost — they keep what they trust. You may cap your value, and you may end up as a feature rather than a product.",
                },
                {
                  id: "c",
                  label: "I am not sure yet",
                  tradeoff:
                    "Then find out what the spreadsheet actually gets wrong. If it fails at one specific step, B is nearly always right for a first version. If it fails everywhere, A becomes plausible.",
                },
              ],
              recommended: "b",
              explanation:
                "For a first product, lowering the switching cost usually beats increasing the value. Sitting beside the incumbent gets you real users in weeks; replacing it is a project. You can grow into A later, and you will do it with users rather than assumptions.",
            },
          ],
        },
        {
          slug: "positioning-basics",
          title: "Positioning: the sentence before the product",
          summary:
            "For whom, instead of what, and why — and why a broad answer is a weak one.",
          type: "concept",
          difficulty: "intermediate",
          minutes: 10,
          completion: "knowledge_check",
          skills: ["product-thinking", "writing"],
          requires: ["your-real-competitor"],
          objectives: [
            "Write a positioning sentence with a named alternative in it",
            "Explain why narrowing the audience strengthens rather than shrinks the claim",
          ],
          blocks: [
            {
              id: "t1",
              kind: "text",
              text: "Positioning is not a tagline. It is the decision about which shelf you are on, and it is made of three parts: who it is for, what it replaces, and what it does better.",
            },
            {
              id: "code1",
              kind: "code",
              language: "text",
              filename: "positioning.txt",
              code: "For [specific person]\nwho currently [named alternative],\n[product] [the one thing it does better],\nunlike [the alternative] which [its specific failure].",
            },
            {
              id: "t2",
              kind: "text",
              text: "The clause people flinch at is the first. Naming a narrow audience feels like giving up market. It does the opposite: it is the only way the rest of the sentence can be specific, and a specific sentence is the only kind anybody repeats.",
            },
            {
              id: "c1",
              kind: "comparison",
              title: "Broad and weak, narrow and strong",
              left: {
                label: "Broad",
                points: [
                  "For businesses who want to save time on finance admin",
                  "Nobody recognises themselves in it",
                  "Every competitor could use the same sentence",
                  "You cannot decide any feature from it",
                ],
              },
              right: {
                label: "Narrow",
                points: [
                  "For landlords with two to five flats who reconcile rent in a spreadsheet, this turns a bank statement into a list of what is missing — unlike the spreadsheet, which cannot tell you what did not arrive",
                  "One reader knows immediately whether it is them",
                  "No incumbent has bothered to say this",
                  "Half your Phase 04 scope decisions are already made",
                ],
              },
            },
            {
              id: "cal1",
              kind: "callout",
              tone: "real_world",
              title: "Narrow first is a strategy, not a limitation",
              text: "Facebook launched to one university. Amazon sold books. Stripe began with developers who had been rejected by traditional payment processors. Starting narrow is not a smaller version of the ambition — it is how you get a real user, a real reference and a real product before you widen.",
            },
            {
              id: "q1",
              kind: "choice",
              question: "What does naming the alternative inside your positioning sentence buy you?",
              multiple: false,
              options: [
                { id: "a", label: "It makes the sentence longer and more impressive" },
                { id: "b", label: "It forces you to state a specific failure you fix, which is the only reason anyone switches" },
                { id: "c", label: "It helps with search engine ranking" },
                { id: "d", label: "It shows you have done competitor research" },
              ],
              correct: ["b"],
              explanation:
                "Without a named alternative you can only claim to be good. With one you have to say what is wrong with the thing they use today — and that sentence is the actual reason a person changes what they do.",
            },
            {
              id: "pr1",
              kind: "predict",
              situation:
                "Two products launch on the same day. One says \"the modern way to manage your rentals\". The other says \"turn your bank statement into a list of rent that did not arrive\".",
              prompt:
                "Which gets more sign-ups from the same audience, and why? Optional — write a line before you read on.",
              reveal:
                "The second, almost always, and the reason is not cleverness. The first asks the reader to imagine a benefit; the second describes a thing they did last Tuesday. Specific beats aspirational when the reader already has the problem — and if they do not have the problem, you did not want them anyway.",
            },
          ],
        },
        {
          slug: "market-sizing-honestly",
          title: "Is this big enough — and for whom?",
          summary:
            "A sane way to size a market when you are one person, and why the usual method misleads.",
          type: "concept",
          difficulty: "intermediate",
          minutes: 9,
          completion: "read",
          skills: ["market-research", "critical-thinking"],
          requires: ["positioning-basics"],
          objectives: [
            "Size a market bottom-up from reachable people",
            "Say what \"big enough\" means for your own goal, rather than for an investor's",
          ],
          blocks: [
            {
              id: "t1",
              kind: "text",
              text: "The usual method — find an industry report, take a percentage — produces a number that is both enormous and useless. It cannot be wrong, because nothing about it is testable.",
            },
            {
              id: "t2",
              kind: "text",
              text: "Do it from the bottom instead, with numbers you can actually check. How many of these people exist somewhere you can reach? What would they plausibly pay? Multiply. The answer will be much smaller and much more honest.",
            },
            {
              id: "s1",
              kind: "steps",
              title: "Bottom-up, in four lines",
              items: [
                "Name a place where these people gather that you can count — a forum with a member count, a directory, a professional register, a subreddit.",
                "Estimate what fraction genuinely has the problem. Your five conversations are the only basis you have; be conservative.",
                "Estimate a price from what they already spend, not from what you would like to charge.",
                "Multiply, then halve it, because you will not reach all of them.",
              ],
            },
            {
              id: "cal1",
              kind: "callout",
              tone: "why",
              title: "Big enough depends on what you want",
              text: "A product that reaches two hundred people paying £20 a month is a failure for a venture-backed company and a life-changing outcome for one person. Decide which you are building before you let a number discourage you. LOCK is built for the second.",
            },
            {
              id: "t3",
              kind: "text",
              text: "The number itself matters less than what it forces you to notice. If you cannot name a single place where a thousand of these people are, that is not a sizing problem — it is a distribution problem, and you have just found it in week three instead of month nine.",
            },
            {
              id: "ex1",
              kind: "expandable",
              summary: "What if the honest number is too small?",
              text: "Three options, in order of usefulness. Widen the person slightly — landlords with two to five flats might become two to fifteen without changing the product. Raise the price by serving a segment with a bigger cost of doing nothing. Or accept it as a first product that teaches you how to build and ship, and treat the market as the thing you fix second. All three are legitimate. Pretending the number is bigger is not.",
            },
          ],
        },
      ],
      mission: {
        slug: "competitor-map",
        title: "Map the alternatives",
        summary:
          "What people do today, what it costs them to switch, and the sentence that says why you are different.",
        type: "analysis",
        difficulty: "foundational",
        minutes: 90,
        objective:
          "Map all four kinds of alternative, price the switching cost, and write your positioning sentence.",
        whyItMatters:
          "You cannot claim to be better than something you have not looked at. This is also where most people discover that their idea already exists, which is far cheaper to find now than after building it.",
        objectives: [
          "All four alternatives mapped, including doing nothing",
          "The switching cost written as specific actions",
          "One positioning sentence with a named alternative in it",
        ],
        blocks: [
          {
            id: "m1",
            kind: "steps",
            title: "How to work through it",
            items: [
              "List what your five interviewees actually do today. That is your real competitor set.",
              "Add the paid software — sign up for the two closest, and use them for twenty minutes each.",
              "For each alternative write one line: what it does well, and the specific thing it gets wrong.",
              "Write the switching cost as a list of actions a user would have to take.",
              "Write your positioning sentence using the four-clause shape.",
            ],
          },
          {
            id: "m2",
            kind: "callout",
            tone: "warning",
            title: "If you find something that already does exactly this",
            text: "Good — that is a finding, not a defeat. Use it. Is it priced for a different size of customer? Does it fail at the step your interviews said matters? Is it abandoned? An existing product proves the problem is real; your job is to find whether it serves your specific person badly. If it serves them well, change the person or change the problem, and be glad it cost you an afternoon.",
          },
          {
            id: "m3",
            kind: "checklist",
            title: "Before you submit",
            items: [
              "Doing nothing and doing it by hand are both on the map",
              "You have actually used the two closest paid products",
              "Every alternative has a specific failure written next to it, not a general criticism",
              "Your positioning sentence names one alternative and one failure",
            ],
          },
        ],
        deliverableTitle: "Competitor Map",
        deliverableDescription:
          "The four alternatives, their specific failures, the switching cost, and your positioning sentence.",
        requiredEvidence: ["document"],
        requiresLesson: "market-sizing-honestly",
        skills: [
          { key: "market-research", primary: true },
          { key: "product-thinking" },
        ],
        toolbox: ["problem-user-evidence"],
      },
    },
  ],
};
