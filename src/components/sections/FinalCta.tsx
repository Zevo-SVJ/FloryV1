"use client";

import { motion } from "framer-motion";
import { PlatformNote } from "@/analyze/PlatformNote";
import { CtaButton } from "@/components/ui/CtaButton";
import { EASE_OUT, onceInView, stagger } from "@/lib/motion";

/**
 * The last invitation. Type, space, one button.
 */

const HEADLINE = ["See", "yourself", "the", "way", "strangers", "do."];

const word = {
  hidden: { opacity: 0, y: "0.38em", filter: "blur(7px)" },
  shown: {
    opacity: 1,
    y: "0em",
    filter: "blur(0px)",
    transition: { duration: 0.9, ease: EASE_OUT },
  },
};

export function FinalCta() {
  return (
    <section className="relative flex min-h-[64svh] flex-col items-center justify-center py-24 text-center sm:py-28">
      <div className="gutter">
        <motion.h2
          className="mx-auto max-w-4xl text-mega"
          variants={stagger(0.075)}
          initial="hidden"
          whileInView="shown"
          viewport={onceInView}
        >
          {HEADLINE.map((part) => (
            <span key={part} className="mr-[0.2em] inline-block">
              <motion.span className="inline-block" variants={word}>
                {part}
              </motion.span>
            </span>
          ))}
        </motion.h2>

        <motion.div
          className="mt-12 flex flex-col items-center gap-6"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={onceInView}
          transition={{ duration: 0.8, ease: EASE_OUT, delay: 0.5 }}
        >
          <CtaButton />
          <PlatformNote />
        </motion.div>
      </div>
    </section>
  );
}
