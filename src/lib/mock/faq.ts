export interface FaqItem {
  question: string;
  answer: string;
}

export const FAQ: FaqItem[] = [
  {
    question: "How accurate is Blink?",
    answer:
      "Blink predicts a first impression, not a fact. It reads the same signals a stranger reads — hierarchy, contrast, consistency, faces, wording — and reports what those signals add up to. Treat the scores as a mirror rather than a verdict: the useful part is which dimension is weakest and precisely why.",
  },
  {
    question: "What kind of profile should I upload?",
    answer:
      "A single screenshot of an Instagram profile page taken on a phone, showing the photo, name, bio, highlights and at least the first two rows of the grid. That is exactly what a stranger sees before deciding, so it is exactly what Blink reads. Cropped screenshots still work, but clarity and consistency scores get less to go on.",
  },
  {
    question: "Does Blink store my screenshot?",
    answer:
      "No. Your screenshot is held in your browser for the length of the analysis and released when you close the report. It is never uploaded, never written to a database, and never shown to anyone else.",
  },
  {
    question: "Can I analyze multiple profiles?",
    answer:
      "As many as you like, one at a time. Running the same profile again after making changes is the most useful thing you can do with Blink — the scores are stable, so movement means the change actually worked.",
  },
  {
    question: "How is my report generated?",
    answer:
      "Blink models what happens in the first seconds of attention: where the eye lands, what it can categorise, what it trusts, and what it remembers. Those readings become eight scores, each with the specific thing on your profile that is holding it back and the single change that would move it.",
  },
  {
    question: "What exactly will Blink improve?",
    answer:
      "The decisions strangers make before they read anything: whether you look credible, whether they can tell what you do, and whether they remember you afterwards. It will not grow your audience for you — it tells you which of your own details are quietly costing you follows.",
  },
  {
    question: "Can I analyze someone else's public profile?",
    answer:
      "Yes, and it is a genuinely good way to calibrate — run a profile you admire and see which dimensions it wins on. Keep it to public profiles, and keep the report to yourself.",
  },
];
