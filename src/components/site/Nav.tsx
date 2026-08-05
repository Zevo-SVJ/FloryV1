"use client";

import { useState } from "react";
import { motion, useMotionValueEvent, useScroll, useSpring } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { EASE_OUT } from "@/lib/motion";

/**
 * The bar.
 *
 * Solid paper — no blur, no translucency. It earns a hairline only once the
 * page has moved, and carries a single accent line showing how far through
 * the story you are.
 */
export function Nav() {
  const { scrollY, scrollYProgress } = useScroll();
  const [lifted, setLifted] = useState(false);

  const progress = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    restDelta: 0.001,
  });

  useMotionValueEvent(scrollY, "change", (value) => {
    setLifted(value > 10);
  });

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <motion.div
        className="bg-paper"
        animate={{
          borderBottomColor: lifted ? "var(--color-line)" : "rgba(0,0,0,0)",
        }}
        transition={{ duration: 0.4, ease: EASE_OUT }}
        style={{ borderBottomWidth: 1, borderBottomStyle: "solid" }}
      >
        <nav className="edge flex h-16 items-center justify-between md:h-[4.5rem]">
          <a
            href="#top"
            className="group flex items-baseline gap-1.5"
            aria-label="Blink, back to top"
          >
            <span className="text-[1.0625rem] font-semibold tracking-[-0.03em]">
              Blink
            </span>
            <motion.span
              className="mb-[3px] block h-[5px] w-[5px] rounded-full bg-accent"
              animate={{ opacity: [1, 0.25, 1] }}
              transition={{
                duration: 3.4,
                repeat: Infinity,
                ease: "easeInOut",
                times: [0, 0.08, 0.16],
              }}
            />
          </a>

          <div className="flex items-center gap-1">
            <a
              href="#how"
              className="hidden rounded-full px-4 py-2 text-[0.9375rem] text-ink-muted transition-colors hover:text-ink sm:block"
            >
              How it reads
            </a>
            <Button href="#analyze" variant="outline">
              Analyze my profile
            </Button>
          </div>
        </nav>
      </motion.div>

      {/* How far through the keynote you are. */}
      <motion.div
        className="h-px origin-left bg-accent"
        style={{ scaleX: progress }}
        aria-hidden
      />
    </header>
  );
}
