import type { PhaseSpec } from "@/lib/curriculum/types";

/**
 * 09 MONETIZE — charge for it, and understand why somebody pays.
 *
 * Deliberately placed after Ship. Pricing decided before anybody has used the
 * product is a guess about a value you have not yet delivered; pricing decided
 * after is a reading of something that happened.
 */
export const monetize: PhaseSpec = {
  key: "monetize",
  modules: [
    {
      slug: "pricing-as-a-product-decision",
      title: "Pricing as a product decision",
      summary:
        "What you charge for, what you charge by, and why the number is the easy part.",
      lessons: [
        {
          slug: "what-you-are-charging-for",
          title: "What you are actually charging for",
          summary:
            "Value, the cost of the alternative, and why cost-plus pricing goes wrong for software.",
          type: "concept",
          difficulty: "intermediate",
          minutes: 10,
          completion: "read",
          skills: ["monetization", "product-thinking"],
          objectives: [
            "Price from the cost of the alternative rather than from your effort",
            "Say what your product is worth to one specific user, in their terms",
          ],
          blocks: [
            {
              id: "t1",
              kind: "text",
              text: "Two instincts to get rid of first. Pricing from what it cost you to build, which the customer does not care about. And pricing from what competitors charge, which imports their positioning along with their number.",
            },
            {
              id: "t2",
              kind: "text",
              text: "Price from the cost of doing nothing — the thing you wrote down in Phase 01. If reconciling by hand takes an evening a month and occasionally misses a payment, the alternative costs real hours and occasional real money. Your price is a fraction of that, and now you can say why.",
            },
            {
              id: "cal1",
              kind: "callout",
              tone: "why",
              title: "This is why Phase 01 insisted on a measurable cost",
              text: "\"It saves time\" cannot be priced. \"It replaces an evening a month and catches the payment you missed in March\" can. The problem statement you wrote at the beginning is the input to this decision, which is one of several reasons vagueness there is expensive here.",
            },
            {
              id: "h1",
              kind: "heading",
              level: 2,
              text: "The number is the easy part",
            },
            {
              id: "t3",
              kind: "text",
              text: "Harder, and more consequential: what you charge by. Per user, per month, per unit of the thing they care about, per outcome. That choice decides who your product is affordable for, how revenue grows, and whether success is punished.",
            },
            {
              id: "tab1",
              kind: "table",
              columns: ["Charge by", "Works when", "Goes wrong when"],
              rows: [
                ["Flat monthly", "Everyone gets similar value", "Your heaviest users cost you the most and pay the same"],
                ["Per seat", "Value grows with team size", "The product is used by one person in a large team"],
                ["Per unit of their work", "Value is obviously proportional", "Their usage is spiky, and the bill becomes unpredictable"],
                ["Per outcome", "The outcome is measurable and attributable", "Attribution is arguable, which it usually is"],
              ],
            },
            {
              id: "t4",
              kind: "text",
              text: "For a first product, flat monthly with one plan is almost always right. Not because it is optimal, but because it is understandable, it is quick to build, and it removes a decision from the customer at the exact moment you want them to make only one.",
            },
            {
              id: "t5",
              kind: "text",
              text: "One structural warning. If your costs scale with usage — you pay per API call for something the customer uses freely — a flat price with no ceiling is a way to lose money on your best customers. Either include a limit, or price by the thing that drives your cost.",
            },
          ],
        },
        {
          slug: "finding-the-number",
          title: "Finding the number",
          summary:
            "Why almost everybody underprices, and the cheapest way to find out you have.",
          type: "concept",
          difficulty: "intermediate",
          minutes: 9,
          completion: "knowledge_check",
          skills: ["monetization", "validation"],
          requires: ["what-you-are-charging-for"],
          objectives: [
            "Set a first price with a stated reason",
            "Test a price without asking anybody a hypothetical",
          ],
          blocks: [
            {
              id: "t1",
              kind: "text",
              text: "Almost every first-time founder prices too low, and the reason is emotional rather than analytical: it feels safer, and a low price feels like it removes an objection. It usually does the opposite.",
            },
            {
              id: "s1",
              kind: "steps",
              title: "What a price that is too low costs you",
              items: [
                "It signals that the product is trivial, which affects how seriously it is evaluated.",
                "It attracts the customers who care most about price and least about the problem — the highest-support, lowest-retention group.",
                "It makes the economics impossible at any realistic number of customers.",
                "It is hard to undo. Raising a price on existing customers is a conversation; setting it correctly is not.",
              ],
            },
            {
              id: "cal1",
              kind: "callout",
              tone: "tip",
              title: "The only price test worth running",
              text: "Not \"what would you pay?\" — a hypothetical, and answered generously. Put a real price on a real page and ask people to buy. The ones who do have told you something; the ones who read it and leave have told you something too, and both are worth more than an opinion.",
            },
            {
              id: "t2",
              kind: "text",
              text: "For a first product with a narrow audience and a measurable cost of doing nothing, a monthly price somewhere between one and ten per cent of the monthly cost you remove is a defensible starting point. Then watch what happens: if nobody hesitates, it is too low.",
            },
            {
              id: "t3",
              kind: "text",
              text: "There is one exception to charging early. If you genuinely do not yet know whether the product delivers the value, a free period is a way to find out — but time-box it, tell people it will end, and end it. \"Free for now\" that runs indefinitely turns into an audience that will never convert and a product with no evidence about demand.",
            },
            {
              id: "q1",
              kind: "choice",
              question: "Which is the most reliable signal that your price is too low?",
              multiple: false,
              options: [
                { id: "a", label: "Customers say it is cheap" },
                { id: "b", label: "Nobody hesitates before buying" },
                { id: "c", label: "Competitors charge more" },
                { id: "d", label: "You feel uncomfortable saying the number" },
              ],
              correct: ["b"],
              explanation:
                "Frictionless purchases mean the price is well below the value, which means you are leaving money on the table and possibly signalling the product is minor. Competitors' prices reflect their positioning, not yours, and your own discomfort tracks confidence rather than value.",
            },
            {
              id: "r1",
              kind: "reflection",
              prompt:
                "What is the monthly cost of doing nothing for your specific user, in hours or money? What fraction of that would you feel comfortable charging, and what does that discomfort tell you? Optional.",
            },
          ],
        },
        {
          slug: "taking-money-safely",
          title: "Taking money without building a payment system",
          summary:
            "What a provider handles, what stays yours, and the two failures that cost real money.",
          type: "build",
          difficulty: "advanced",
          minutes: 11,
          completion: "read",
          skills: ["monetization", "backend"],
          requires: ["finding-the-number"],
          objectives: [
            "Say which parts of billing you must never implement yourself",
            "Design the link between a payment and what a user may do",
          ],
          blocks: [
            {
              id: "t1",
              kind: "text",
              text: "Use a payment provider, and do not touch card details. Handling them yourself brings compliance obligations that are wildly out of proportion to a first product, and providers have solved this comprehensively.",
            },
            {
              id: "t2",
              kind: "text",
              text: "What the provider gives you: checkout, card storage, subscriptions, retries when a card fails, tax handling in many places, and a hosted page you can point at in an afternoon. What stays yours is the interesting part, and it is where the bugs are.",
            },
            {
              id: "h1",
              kind: "heading",
              level: 2,
              text: "The part that is yours",
            },
            {
              id: "t3",
              kind: "text",
              text: "The link between \"this person is paying\" and \"this person may do X\". That is a state in your own database, updated when the provider tells you something changed, and consulted on every request that matters.",
            },
            {
              id: "s1",
              kind: "steps",
              title: "The two failures that actually cost money",
              items: [
                "Trusting the browser. If the redirect back from checkout is what unlocks the product, anyone can visit that URL. Entitlement must come from the provider's server-to-server notification, verified.",
                "Ignoring the cancellation. Subscriptions end, cards fail, refunds happen. If you only handle the successful purchase, you have built a system that grants access and never removes it.",
              ],
            },
            {
              id: "cal1",
              kind: "callout",
              tone: "warning",
              title: "Verify the webhook signature",
              text: "Payment notifications arrive at a public URL. If you act on whatever arrives, anybody who finds that URL can grant themselves a subscription. Every provider signs its requests and every provider documents how to check the signature. This is ten lines and it is not optional.",
            },
            {
              id: "t4",
              kind: "text",
              text: "Test the unhappy paths before launch, in the provider's test mode: a card that fails, a subscription cancelled mid-period, a refund. Each one should leave your database in a state you would be comfortable explaining to the customer.",
            },
            {
              id: "p1",
              kind: "prompt",
              title: "Review a billing integration",
              prompt: "Here is my billing integration.\n\nCheck specifically for:\n1. Anywhere entitlement is granted from a browser redirect rather than from a verified server-side event.\n2. Missing handling for cancellation, payment failure and refund.\n3. Whether the webhook signature is verified before the payload is trusted.\n4. What happens if the same webhook is delivered twice.\n\nFor each problem, show the smallest fix.",
              why: "These four are the failures that appear in almost every first billing implementation, and the fourth — duplicate delivery — is the one nobody thinks about until it double-charges somebody.",
            },
          ],
        },
      ],
      mission: {
        slug: "pricing-and-billing",
        title: "Put a price on it and take a payment",
        summary:
          "A stated price with a reason behind it, and one real transaction that works end to end.",
        type: "build",
        difficulty: "advanced",
        minutes: 300,
        objective:
          "Decide your price and what it is charged by, then implement billing and complete a real end-to-end transaction.",
        whyItMatters:
          "Money is the highest rung on the evidence ladder. It is also the point at which your product stops being a project — and the failure cases you handle now are the ones you will not be handling at midnight later.",
        objectives: [
          "A price, a charging model, and the reasoning for both",
          "Working checkout with entitlement granted from a verified server event",
          "Cancellation, failure and refund handled and tested",
        ],
        blocks: [
          {
            id: "m1",
            kind: "steps",
            title: "How to work through it",
            items: [
              "Write the cost of doing nothing for your user, in their terms. Set the price against it and write the reason in one sentence.",
              "Choose what you charge by, and say what happens to a heavy user and to a light one.",
              "Implement checkout with a provider. Do not handle card details.",
              "Grant entitlement from the verified webhook, never from the redirect.",
              "Test in the provider's test mode: success, failed card, cancellation, refund, and the same webhook delivered twice.",
              "Complete one real transaction, even if it is your own card.",
            ],
          },
          {
            id: "m2",
            kind: "callout",
            tone: "real_world",
            title: "Charging your first customer is a threshold",
            text: "It is also where a certain kind of founder stalls indefinitely, because free avoids the possibility of rejection. If you find yourself adding one more feature before you can charge, notice what the delay is actually for.",
          },
          {
            id: "m3",
            kind: "checklist",
            title: "Before you submit",
            items: [
              "The price has a written reason connected to the cost of the alternative",
              "No card details touch your servers",
              "Entitlement comes from a signature-verified server event",
              "Cancellation, failure, refund and duplicate delivery are all tested",
            ],
          },
        ],
        deliverableTitle: "Pricing Strategy",
        deliverableDescription:
          "The price, the charging model, the reasoning, and the evidence that a real transaction and its failure cases work.",
        requiredEvidence: ["document", "url"],
        requiresLesson: "taking-money-safely",
        skills: [
          { key: "monetization", primary: true },
          { key: "backend" },
        ],
      },
    },
  ],
};
