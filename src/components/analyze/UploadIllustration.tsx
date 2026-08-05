"use client";

import { motion, type Variants } from "framer-motion";
import { EASE_OUT } from "@/lib/motion";

/**
 * The empty state.
 *
 * A screenshot being lifted out of a phone, drawn in a single line weight.
 * It draws itself once on arrival, then lifts slightly while a file is being
 * dragged over the target — enough life to feel responsive, not enough to
 * distract.
 */

const draw: Variants = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: (index: number) => ({
    pathLength: 1,
    opacity: 1,
    transition: {
      pathLength: { duration: 1.1, ease: EASE_OUT, delay: 0.1 + index * 0.11 },
      opacity: { duration: 0.35, delay: 0.1 + index * 0.11 },
    },
  }),
};

export function UploadIllustration({ active }: { active: boolean }) {
  return (
    <motion.div
      animate={{ y: active ? -7 : 0, scale: active ? 1.03 : 1 }}
      transition={{ duration: 0.7, ease: EASE_OUT }}
    >
      <motion.svg
        width="128"
        height="128"
        viewBox="0 0 132 132"
        fill="none"
        aria-hidden
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.5 }}
      >
        <g
          stroke="var(--color-ink)"
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.8"
        >
          {/* the phone */}
          <motion.rect x="24" y="32" width="56" height="86" rx="9" variants={draw} custom={0} />
          <motion.path d="M44 38h16" variants={draw} custom={1} />

          {/* the screenshot, lifted out of it */}
          <motion.rect
            x="58"
            y="14"
            width="52"
            height="68"
            rx="7"
            fill="var(--color-surface)"
            variants={draw}
            custom={2}
          />
          <motion.circle cx="73" cy="31" r="6.5" variants={draw} custom={3} />
          <motion.path d="M86 27h16" variants={draw} custom={4} />
          <motion.path d="M86 35h11" variants={draw} custom={4} />
          <motion.path d="M66 49h36" variants={draw} custom={5} />
          <motion.path d="M66 58h36" variants={draw} custom={5} />
          <motion.path d="M66 67h21" variants={draw} custom={6} />
        </g>

        {/* the one accent: where attention lands first */}
        <motion.circle
          cx="73"
          cy="31"
          r="2.5"
          fill="var(--color-accent)"
          initial={{ scale: 0, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.55, ease: EASE_OUT, delay: 1.05 }}
        />
      </motion.svg>
    </motion.div>
  );
}
