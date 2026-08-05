"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { motion } from "framer-motion";
import { IconClose } from "@/components/ui/Icons";
import { EASE_IN_OUT, SHEET_IN, SHEET_OUT } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * The surface the whole flow happens on.
 *
 * A bottom sheet on phones and a centred panel above that, because those are
 * the two shapes people already know. The scrim is a flat dim — no blur, no
 * frosted glass — so the page behind recedes without turning into decoration.
 */
export function Sheet({
  children,
  onClose,
  labelledBy,
  wide = false,
  fill = false,
}: {
  children: ReactNode;
  onClose: () => void;
  labelledBy: string;
  /** The report needs more room than the upload step. */
  wide?: boolean;
  /** Only the report is long enough to fill the screen on a phone. */
  fill?: boolean;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Move focus into the sheet so Escape and Tab behave as expected.
  useEffect(() => {
    panelRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-6">
      <motion.button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-ink/25"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3, ease: EASE_IN_OUT }}
      />

      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className={cn(
          "relative flex w-full flex-col overflow-hidden bg-white outline-none",
          "rounded-t-sheet shadow-sheet sm:rounded-panel sm:shadow-raise",
          fill ? "h-[93svh]" : "max-h-[93svh]",
          "sm:h-auto sm:max-h-[92svh]",
          wide ? "sm:max-w-3xl lg:max-w-5xl" : "sm:max-w-xl",
        )}
        initial={{ y: "6%", opacity: 0, scale: 0.985 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: "4%", opacity: 0, scale: 0.99, transition: SHEET_OUT }}
        transition={SHEET_IN}
      >
        {/* The grabber reads as a sheet on touch, and is decorative elsewhere. */}
        <div className="flex justify-center pt-3 sm:hidden" aria-hidden>
          <span className="h-1 w-9 rounded-full bg-edge-strong" />
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-sunken hover:text-ink sm:right-4 sm:top-4"
        >
          <IconClose className="h-4 w-4" />
        </button>

        {children}
      </motion.div>
    </div>
  );
}
