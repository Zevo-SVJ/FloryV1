import type { Transition, Variants } from "framer-motion";

/**
 * Blink's motion language.
 *
 * The product is a consumer app, so motion has to feel native rather than
 * decorative: things move the way sheets, cards and numbers move in a good
 * phone app — with weight, on a shared clock, and never bouncing.
 *
 *  1. No overshoot. Springs are used only where they read as physical
 *     (a sheet settling), and always critically damped.
 *  2. Entrances decelerate; travel between two states is symmetrical.
 *  3. Timing is layered in 60–90ms increments so groups arrive as groups.
 */

/** Deceleration for anything entering the frame. */
export const EASE_OUT = [0.16, 1, 0.3, 1] as const;
/** Symmetrical, for anything travelling between two known states. */
export const EASE_IN_OUT = [0.62, 0, 0.34, 1] as const;
/** Firm and quick, for small controls. */
export const EASE_SNAP = [0.3, 0.7, 0, 1] as const;

export const DURATION = {
  /** Press, hover, focus. Felt, not seen. */
  tap: 0.16,
  /** Small elements arriving. */
  quick: 0.4,
  /** The default reveal. */
  base: 0.68,
  /** Panels, layout changes, scene changes. */
  scene: 1,
  /** Cinematic travel. */
  epic: 1.5,
} as const;

export const transition = {
  tap: { duration: DURATION.tap, ease: EASE_OUT },
  quick: { duration: DURATION.quick, ease: EASE_OUT },
  base: { duration: DURATION.base, ease: EASE_OUT },
  scene: { duration: DURATION.scene, ease: EASE_IN_OUT },
  epic: { duration: DURATION.epic, ease: EASE_IN_OUT },
} satisfies Record<string, Transition>;

/** A sheet settling into place — damped hard, so it never wobbles. */
export const SHEET_IN: Transition = {
  type: "spring",
  stiffness: 260,
  damping: 34,
  mass: 0.9,
};

export const SHEET_OUT: Transition = {
  duration: 0.32,
  ease: EASE_IN_OUT,
};

/** Content arriving: rise, fade, and a whisper of blur. */
export const rise: Variants = {
  hidden: { opacity: 0, y: 20, filter: "blur(5px)" },
  shown: { opacity: 1, y: 0, filter: "blur(0px)", transition: transition.base },
};

export const fade: Variants = {
  hidden: { opacity: 0 },
  shown: { opacity: 1, transition: transition.base },
};

/** Parent that hands its children a staggered entrance. */
export function stagger(each = 0.07, delay = 0): Variants {
  return {
    hidden: {},
    shown: { transition: { staggerChildren: each, delayChildren: delay } },
  };
}

/** Scroll reveals fire once, a little before centre. */
export const onceInView = { once: true, amount: 0.3 } as const;

/** Scenes only run while they are actually on screen. */
export const sceneInView = { amount: 0.4 } as const;
