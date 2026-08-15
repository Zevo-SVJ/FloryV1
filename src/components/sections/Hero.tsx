"use client";

import { motion } from "framer-motion";
import { PlatformNote } from "@/analyze/PlatformNote";
import { HeroScene } from "@/components/scene/HeroScene";
import { CtaButton } from "@/components/ui/CtaButton";
import { DURATION, EASE_OUT, stagger } from "@/lib/motion";

/**
 * The opening.
 *
 * The headline arrives word by word, the way a sentence is actually read, while
 * the film beside it explains the product without help. The button opens the
 * flow immediately — nothing here scrolls anywhere.
 */

const HEADLINE = ["Know", "what", "people", "think", "before", "they", "follow."];

const word = {
  hidden: { opacity: 0, y: "0.4em", filter: "blur(7px)" },
  shown: {
    opacity: 1,
    y: "0em",
    filter: "blur(0px)",
    transition: { duration: 0.9, ease: EASE_OUT },
  },
};

export function Hero() {
  return (
    <section
      id="top"
      className="relative flex min-h-[100svh] flex-col justify-center pb-16 pt-28 sm:pb-20 sm:pt-32"
    >
      <div className="gutter">
        <div className="grid items-center gap-12 lg:grid-cols-[1.04fr_0.96fr] lg:gap-8 xl:gap-14">
          <div className="max-w-[36rem] lg:max-w-[34rem]">
            <motion.h1
              className="text-hero"
              variants={stagger(0.07, 0.12)}
              initial="hidden"
              animate="shown"
            >
              {HEADLINE.map((part) => (
                <span key={part} className="mr-[0.2em] inline-block">
                  <motion.span className="inline-block" variants={word}>
                    {part}
                  </motion.span>
                </span>
              ))}
            </motion.h1>

            <motion.p
              className="mt-7 max-w-md text-lede text-ink-3"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: DURATION.base, ease: EASE_OUT, delay: 0.8 }}
            >
              One screenshot. Eight dimensions of the impression a stranger forms
              before they read a word.
            </motion.p>

            <motion.div
              className="mt-9 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-5"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: DURATION.base, ease: EASE_OUT, delay: 0.94 }}
            >
              <CtaButton />
              <PlatformNote />
            </motion.div>

            <motion.p
              className="mt-8 text-[0.8125rem] text-ink-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: DURATION.base, ease: EASE_OUT, delay: 1.15 }}
            >
              No account needed. Your screenshot is read once, then discarded.
            </motion.p>
          </div>

          <motion.div
            className="relative w-full"
            initial={{ opacity: 0, scale: 0.985 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, ease: EASE_OUT, delay: 0.3 }}
          >
            <HeroScene />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
