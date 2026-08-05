import type { Transition, Variants } from "framer-motion";

/**
 * Blink's motion language.
 *
 * Three rules, applied everywhere:
 *  1. Nothing bounces. No spring overshoot, no elastic easing.
 *  2. Objects have weight — they start slowly and settle slowly.
 *  3. Timing is layered. Related elements move together, offset by
 *     small, consistent increments, never all at once.
 */

/** Decelerating curve for anything entering the frame. */
export const EASE_OUT = [0.16, 1, 0.3, 1] as const;
/** Symmetrical curve for anything travelling between two states. */
export const EASE_IN_OUT = [0.66, 0, 0.34, 1] as const;
/** Slightly firmer entrance for small, precise elements. */
export const EASE_PRECISE = [0.32, 0.72, 0, 1] as const;

export const DURATION = {
  /** Hover, press, focus — felt, not seen. */
  micro: 0.18,
  /** Small elements arriving. */
  quick: 0.42,
  /** The default. Most reveals live here. */
  base: 0.72,
  /** Large objects, layout shifts, scene changes. */
  scene: 1.1,
  /** Cinematic travel across the stage. */
  epic: 1.6,
} as const;

export const transition = {
  micro: { duration: DURATION.micro, ease: EASE_OUT },
  quick: { duration: DURATION.quick, ease: EASE_OUT },
  base: { duration: DURATION.base, ease: EASE_OUT },
  scene: { duration: DURATION.scene, ease: EASE_IN_OUT },
  epic: { duration: DURATION.epic, ease: EASE_IN_OUT },
} satisfies Record<string, Transition>;

/** Reveal a block of content: rise, fade, and a whisper of blur. */
export const fadeRise: Variants = {
  hidden: { opacity: 0, y: 24, filter: "blur(6px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: transition.base,
  },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: transition.base },
};

/** Parent that hands its children a staggered entrance. */
export function staggerParent(stagger = 0.08, delayChildren = 0): Variants {
  return {
    hidden: {},
    visible: {
      transition: { staggerChildren: stagger, delayChildren },
    },
  };
}

/** Scroll-reveal defaults: fire once, a little before centre. */
export const inViewOnce = {
  once: true,
  amount: 0.35,
} as const;

/** Cinematics only animate while the viewer can actually see them. */
export const stageInView = {
  amount: 0.45,
} as const;
