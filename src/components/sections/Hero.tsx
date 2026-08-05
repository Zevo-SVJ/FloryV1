"use client";

import { motion } from "framer-motion";
import { HeroCinematic } from "@/components/cinematics/HeroCinematic";
import { Button } from "@/components/ui/Button";
import { IconArrowRight } from "@/components/ui/Icons";
import { DURATION, EASE_OUT, staggerParent } from "@/lib/motion";

/**
 * Section one.
 *
 * The headline arrives word by word — the way a sentence is actually read —
 * while the film beside it explains the product without help.
 */

const HEADLINE = [
  { text: "Know" },
  { text: "what" },
  { text: "people" },
  { text: "think", italic: true },
  { text: "before" },
  { text: "they" },
  { text: "follow." },
];

const word = {
  hidden: { opacity: 0, y: "0.42em", filter: "blur(7px)" },
  visible: {
    opacity: 1,
    y: "0em",
    filter: "blur(0px)",
    transition: { duration: 0.95, ease: EASE_OUT },
  },
};

export function Hero() {
  return (
    <section
      id="top"
      className="relative flex min-h-[100svh] flex-col justify-center pb-20 pt-32 md:pb-24 md:pt-36"
    >
      <div className="edge">
        <div className="grid items-center gap-16 lg:grid-cols-[1.02fr_0.98fr] lg:gap-10 xl:gap-16">
          {/* The claim. */}
          <div className="max-w-2xl">
            <motion.h1
              className="text-hero font-medium"
              variants={staggerParent(0.075, 0.15)}
              initial="hidden"
              animate="visible"
            >
              {HEADLINE.map((part) => (
                <span key={part.text} className="mr-[0.22em] inline-block">
                  <motion.span
                    className={
                      part.italic
                        ? "serif-italic inline-block pr-[0.04em] tracking-[-0.02em]"
                        : "inline-block"
                    }
                    variants={word}
                  >
                    {part.text}
                  </motion.span>
                </span>
              ))}
            </motion.h1>

            <motion.p
              className="mt-8 max-w-lg text-lede text-ink-muted"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: DURATION.base, ease: EASE_OUT, delay: 0.85 }}
            >
              Upload a screenshot of your profile. Blink reads it the way a stranger
              does — in seconds — and tells you the impression you are actually
              making.
            </motion.p>

            <motion.div
              className="mt-11 flex flex-col items-start gap-5 sm:flex-row sm:items-center"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: DURATION.base, ease: EASE_OUT, delay: 1 }}
            >
              <Button
                href="#analyze"
                size="lg"
                trailing={<IconArrowRight className="h-4 w-4" />}
              >
                Analyze my profile
              </Button>
              <a
                href="#how"
                className="text-[0.9375rem] font-medium text-ink-muted underline decoration-line-strong decoration-1 underline-offset-4 transition-colors hover:text-ink hover:decoration-ink/40"
              >
                See how it reads a profile
              </a>
            </motion.div>

            <motion.p
              className="mt-10 text-[0.8125rem] text-ink-faint"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: DURATION.base, ease: EASE_OUT, delay: 1.25 }}
            >
              No account. Nothing stored. Nine seconds.
            </motion.p>
          </div>

          {/* The film. */}
          <motion.div
            className="relative w-full"
            initial={{ opacity: 0, scale: 0.985 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.3, ease: EASE_OUT, delay: 0.35 }}
          >
            <HeroCinematic />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
