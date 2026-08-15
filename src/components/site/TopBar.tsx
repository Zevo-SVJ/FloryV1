"use client";

import { useState } from "react";
import { motion, useMotionValueEvent, useScroll, useSpring } from "framer-motion";
import { Wordmark } from "@/components/brand/Brand";
import { AccountMenu } from "@/components/site/AccountMenu";
import { CtaButton } from "@/components/ui/CtaButton";
import { EASE_OUT } from "@/lib/motion";

/**
 * The bar.
 *
 * Solid white — no blur, no translucency. It earns a hairline only once the
 * page has moved, and carries a single accent line showing how far through the
 * story you are.
 */
export function TopBar() {
  const { scrollY, scrollYProgress } = useScroll();
  const [lifted, setLifted] = useState(false);

  const progress = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    restDelta: 0.001,
  });

  useMotionValueEvent(scrollY, "change", (value) => setLifted(value > 8));

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <motion.div
        className="bg-canvas"
        style={{ borderBottomWidth: 1, borderBottomStyle: "solid" }}
        animate={{ borderBottomColor: lifted ? "var(--color-edge)" : "rgba(0,0,0,0)" }}
        transition={{ duration: 0.35, ease: EASE_OUT }}
      >
        <nav className="gutter flex h-[3.75rem] items-center justify-between sm:h-[4.25rem]">
          <a href="#top" aria-label="Blink, back to top" className="rounded-lg">
            <Wordmark />
          </a>

          <div className="flex items-center gap-1 sm:gap-2">
            <a
              href="#questions"
              className="hidden rounded-full px-3.5 py-2 text-[0.875rem] text-ink-3 transition-colors hover:text-ink sm:block"
            >
              Questions
            </a>
            <AccountMenu />
            <CtaButton size="sm" variant="secondary" withArrow={false} label="Analyze" />
          </div>
        </nav>
      </motion.div>

      <motion.div
        className="h-[2px] origin-left bg-accent"
        style={{ scaleX: progress }}
        aria-hidden
      />
    </header>
  );
}
