"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { IconArrowRight } from "@/components/ui/Icons";
import { EASE_OUT, inViewOnce, staggerParent } from "@/lib/motion";

/**
 * Section eight. Type, space, one button.
 */

const HEADLINE = [
  { text: "See" },
  { text: "yourself" },
  { text: "through" },
  { text: "someone" },
  { text: "else's", italic: true },
  { text: "eyes." },
];

const word = {
  hidden: { opacity: 0, y: "0.4em", filter: "blur(7px)" },
  visible: {
    opacity: 1,
    y: "0em",
    filter: "blur(0px)",
    transition: { duration: 0.95, ease: EASE_OUT },
  },
};

export function FinalCta() {
  return (
    <section className="relative flex min-h-[62svh] flex-col items-center justify-center py-24 text-center md:py-32">
      <div className="edge">
        <motion.h2
          className="mx-auto max-w-5xl text-mega font-medium"
          variants={staggerParent(0.08)}
          initial="hidden"
          whileInView="visible"
          viewport={inViewOnce}
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
        </motion.h2>

        <motion.div
          className="mt-16 flex flex-col items-center gap-7"
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={inViewOnce}
          transition={{ duration: 0.8, ease: EASE_OUT, delay: 0.55 }}
        >
          <Button
            href="#analyze"
            size="lg"
            trailing={<IconArrowRight className="h-4 w-4" />}
          >
            Analyze my profile
          </Button>
          <p className="text-[0.8125rem] text-ink-faint">
            One screenshot. About nine seconds.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
