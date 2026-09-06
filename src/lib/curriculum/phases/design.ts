import type { PhaseSpec } from "@/lib/curriculum/types";

/**
 * 05 DESIGN — decide how it looks, reads and behaves.
 *
 * Written for somebody who is not a designer and does not intend to become one.
 * The aim is a product that is clear rather than beautiful, and the route to
 * that is structure and words, not taste.
 */
export const design: PhaseSpec = {
  key: "design",
  modules: [
    {
      slug: "designing-the-flow",
      title: "Designing the flow before the screens",
      summary:
        "States, steps and the empty screen — the parts that decide whether a product feels finished.",
      lessons: [
        {
          slug: "flow-before-screens",
          title: "Draw the flow, not the interface",
          summary:
            "A product is a sequence of states. Get the sequence right and the screens become obvious.",
          type: "concept",
          difficulty: "intermediate",
          minutes: 9,
          completion: "read",
          skills: ["ux-thinking", "product-design"],
          objectives: [
            "Express version one as a sequence of states",
            "Identify the state that carries the value",
          ],
          blocks: [
            {
              id: "t1",
              kind: "text",
              text: "Before any layout, write the states. A state is what the product is showing and what the user can do from there. For most first versions there are between three and six, and listing them takes ten minutes.",
            },
            {
              id: "code1",
              kind: "code",
              language: "text",
              filename: "states.txt",
              code: "1  Nothing yet          → the only action: add what rent you expect\n2  Expectations set     → the only action: upload a statement\n3  Statement uploaded   → matching in progress\n4  Result               → the list of what did not arrive     ← the value\n5  Nothing missing      → say so plainly, and say when to come back",
            },
            {
              id: "t2",
              kind: "text",
              text: "Two things fall out immediately. State 4 is the product — everything else exists to get there, and it should be the best-looking thing you build. And state 5, the happy case where nothing is wrong, is a real state that founders routinely forget to design, so it ends up as a blank screen that reads as a bug.",
            },
            {
              id: "cal1",
              kind: "callout",
              tone: "why",
              title: "The four states almost everybody forgets",
              text: "Empty — before there is any data. Loading — while something is happening. Error — when it fails. And the successful-but-empty case, where the product worked and the answer is 'nothing'. These four are where an application either feels considered or feels unfinished, and they cost very little to do properly.",
            },
            {
              id: "t3",
              kind: "text",
              text: "Write your states now, on paper. Then, for each one, write the single most important thing on that screen and the one action available. If a state has three equally important actions, it is probably two states.",
            },
            {
              id: "q1",
              kind: "choice",
              question: "Which state most often gets skipped, and reads as a broken product when it is?",
              multiple: false,
              options: [
                { id: "a", label: "The loading state" },
                { id: "b", label: "The successful-but-empty state — it worked, and the answer is nothing" },
                { id: "c", label: "The main result state" },
                { id: "d", label: "The sign-in state" },
              ],
              correct: ["b"],
              explanation:
                "Loading and errors are at least remembered as categories. The case where the product ran correctly and found nothing gets built as a blank area, which the user reads as a failure. Saying \"all four rents arrived — check again after the 5th\" is the difference between a tool that works and one that appears to have crashed.",
            },
          ],
        },
        {
          slug: "interface-without-a-designer",
          title: "An interface without a designer",
          summary:
            "Four decisions that account for most of how finished a product looks.",
          type: "concept",
          difficulty: "intermediate",
          minutes: 11,
          completion: "read",
          skills: ["product-design", "ux-thinking"],
          requires: ["flow-before-screens"],
          objectives: [
            "Apply hierarchy, spacing, restraint and alignment to a screen",
            "Say why one strong action per screen beats several equal ones",
          ],
          blocks: [
            {
              id: "t1",
              kind: "text",
              text: "You are not going to out-design a design team, and you do not need to. Almost all of the gap between an amateur interface and a professional one comes from four decisions, none of which require taste.",
            },
            {
              id: "h1",
              kind: "heading",
              level: 2,
              text: "1. One thing is the most important",
            },
            {
              id: "t2",
              kind: "text",
              text: "On every screen, decide what the single most important element is, and make it visibly bigger, heavier or higher than everything else. Amateur interfaces are flat — five things at the same size — which forces the reader to decide where to look, which is work you were supposed to do for them.",
            },
            {
              id: "h2",
              kind: "heading",
              level: 2,
              text: "2. Space is structure",
            },
            {
              id: "t3",
              kind: "text",
              text: "Things that belong together sit close; things that do not sit far apart. That single rule, applied consistently, does more for legibility than any colour choice. The common mistake is uniform spacing everywhere, which tells the reader nothing about what relates to what.",
            },
            {
              id: "h3",
              kind: "heading",
              level: 2,
              text: "3. Restraint in everything countable",
            },
            {
              id: "t4",
              kind: "text",
              text: "One typeface. Two or three text sizes. One accent colour, used only where it means something. Two corner radii at most. Every extra option is a decision you will make inconsistently across twenty screens, and inconsistency is what reads as unfinished.",
            },
            {
              id: "h4",
              kind: "heading",
              level: 2,
              text: "4. Line things up",
            },
            {
              id: "t5",
              kind: "text",
              text: "Pick a left edge and put everything on it. Most interfaces that feel sloppy are misaligned by a few pixels in a dozen places, and the reader registers it without being able to name it.",
            },
            {
              id: "cal1",
              kind: "callout",
              tone: "tip",
              title: "Use LOCK itself as a reference",
              text: "The interface you are reading this in is built from those four rules and nothing else. One system typeface, one accent used only for state and the primary action, grouped lists instead of a card per row, and a single left edge. Open the developer tools and look at how little there is.",
            },
            {
              id: "h5",
              kind: "heading",
              level: 2,
              text: "Words are part of the design",
            },
            {
              id: "t6",
              kind: "text",
              text: "The label on a button and the sentence in an empty state do more work than the layout around them. \"Submit\" tells the user nothing; \"Check this month\" tells them what is about to happen. Write the words before you style anything, and write them as though speaking to one person.",
            },
            {
              id: "c1",
              kind: "comparison",
              title: "The same empty state, two ways",
              left: {
                label: "Unfinished",
                points: ["No data", "A grey box", "A generic illustration"],
              },
              right: {
                label: "Considered",
                points: [
                  "\"Nothing to check yet\"",
                  "\"Add what you expect each tenant to pay, then upload a statement.\"",
                  "One button: Add expected rent",
                ],
              },
            },
          ],
        },
        {
          slug: "designing-for-a-phone",
          title: "Designing for a phone first",
          summary:
            "Why the narrow screen is the honest one, and what it forces you to decide.",
          type: "concept",
          difficulty: "intermediate",
          minutes: 8,
          completion: "knowledge_check",
          skills: ["ux-thinking", "product-design"],
          requires: ["interface-without-a-designer"],
          objectives: [
            "Decide a screen's priority order by designing it narrow first",
            "Name the three things that break most often on a phone",
          ],
          blocks: [
            {
              id: "t1",
              kind: "text",
              text: "Design the narrow version first, not because most of your users will be on a phone — for many products they will not be — but because a narrow screen removes the option to avoid deciding. On a wide screen you can put everything side by side. On a 390-pixel column you have to say what comes first.",
            },
            {
              id: "t2",
              kind: "text",
              text: "That ordering is the actual design decision. Once you have it, the wide layout is mostly a matter of letting things sit beside each other.",
            },
            {
              id: "s1",
              kind: "steps",
              title: "What breaks on a phone, in order of frequency",
              items: [
                "Tables. A five-column table is unreadable at 390 pixels. Either it scrolls inside its own container, or each row becomes a small block of labelled values.",
                "Touch targets. A link set in body text is a fine target for a mouse and a poor one for a thumb. Anything primary wants to be around 44 pixels tall.",
                "Anything fixed to the bottom. A floating bar has to clear the home indicator and must not sit on top of the last thing on the page.",
              ],
            },
            {
              id: "cal1",
              kind: "callout",
              tone: "tip",
              title: "Test it at the real size, not by dragging the window",
              text: "Browser dev tools have device presets. Use 390 and 430 wide, and actually scroll to the bottom of the page. Most mobile bugs are at the bottom, where a fixed element covers the last control, and dragging a desktop window narrow does not reproduce them.",
            },
            {
              id: "q1",
              kind: "choice",
              question: "Why design the narrow layout first?",
              multiple: false,
              options: [
                { id: "a", label: "Because most users are on phones" },
                { id: "b", label: "Because it forces you to decide what is most important, and that ordering is the design" },
                { id: "c", label: "Because it is faster to build" },
                { id: "d", label: "Because search engines prefer it" },
              ],
              correct: ["b"],
              explanation:
                "The share of mobile users varies enormously by product, so A is not a general reason. The real argument is that a narrow column will not let you dodge the priority decision — and once you have made it, the wide layout is comparatively easy.",
            },
          ],
        },
      ],
      mission: {
        slug: "ux-blueprint",
        title: "Design the flow",
        summary:
          "Every state, every empty case, and the words on each screen — before any code.",
        type: "design",
        difficulty: "intermediate",
        minutes: 120,
        objective:
          "Produce a state-by-state blueprint of version one, including the empty, loading, error and nothing-to-report cases, with the real words written.",
        whyItMatters:
          "This is what you hand to the execution layer in Phase 06. A blueprint with the words already written produces a build that needs correcting once; a vague description produces one that needs correcting continuously.",
        objectives: [
          "Every state listed, including the four that get forgotten",
          "The most important element and the single action named for each",
          "Real words — headings, button labels, empty-state sentences",
        ],
        blocks: [
          {
            id: "m1",
            kind: "text",
            text: "Paper or a plain document is fine. You are not producing visual design; you are producing decisions. A drawing tool is optional and often slows this down.",
          },
          {
            id: "m2",
            kind: "steps",
            title: "How to work through it",
            items: [
              "List the states from your one path. Then add empty, loading, error and successful-but-empty.",
              "For each state write: the most important element, the one action, and everything else it shows.",
              "Write the real words. Headings, button labels, and the sentence in each empty state.",
              "Sketch the narrow layout for the two states that matter most. Rough boxes are enough.",
              "Note where a table appears, and decide now what it does at 390 pixels.",
            ],
          },
          {
            id: "m3",
            kind: "checklist",
            title: "Before you submit",
            items: [
              "The four forgotten states are all present with real copy",
              "No button is labelled Submit, OK or Continue without saying what happens",
              "Every state has exactly one primary action",
              "Any table has a decided narrow-screen behaviour",
            ],
          },
        ],
        deliverableTitle: "UX Blueprint",
        deliverableDescription:
          "Every state of version one with its priority, its single action and its real words, plus the narrow-screen decisions.",
        requiredEvidence: ["document"],
        requiresLesson: "designing-for-a-phone",
        skills: [
          { key: "ux-thinking", primary: true },
          { key: "product-design" },
          { key: "writing" },
        ],
      },
    },
  ],
};
