"use client";

import { useId, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { IconPlus } from "@/components/ui/Icons";
import { EASE_IN_OUT, EASE_OUT } from "@/lib/motion";
import { cn } from "@/lib/utils";

export interface AccordionItem {
  question: string;
  answer: string;
}

/**
 * The accordion.
 *
 * One row open at a time. The plus rotates into a minus, the row's ink
 * darkens, and the answer unfolds on a height animation rather than a fade —
 * so the page visibly makes room for it instead of the text appearing on top
 * of nothing.
 */
export function Accordion({ items }: { items: AccordionItem[] }) {
  const [open, setOpen] = useState<number | null>(0);
  const baseId = useId();

  return (
    <div className="border-t border-edge">
      {items.map((item, index) => {
        const isOpen = open === index;
        const panelId = `${baseId}-panel-${index}`;
        const buttonId = `${baseId}-button-${index}`;

        return (
          <div key={item.question} className="border-b border-edge">
            <h3>
              <button
                id={buttonId}
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpen(isOpen ? null : index)}
                className="group flex w-full items-center justify-between gap-6 py-6 text-left sm:py-7"
              >
                <motion.span
                  className="display text-[1.0625rem] font-medium tracking-[-0.02em] sm:text-[1.1875rem]"
                  animate={{ color: isOpen ? "var(--color-ink)" : "var(--color-ink-2)" }}
                  transition={{ duration: 0.3, ease: EASE_OUT }}
                >
                  {item.question}
                </motion.span>

                <motion.span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors",
                    isOpen ? "bg-ink text-white" : "bg-sunken text-ink-2 group-hover:bg-edge",
                  )}
                  animate={{ rotate: isOpen ? 135 : 0 }}
                  transition={{ duration: 0.45, ease: EASE_IN_OUT }}
                >
                  <IconPlus className="h-4 w-4" />
                </motion.span>
              </button>
            </h3>

            <AnimatePresence initial={false}>
              {isOpen ? (
                <motion.div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{
                    height: { duration: 0.42, ease: EASE_IN_OUT },
                    opacity: { duration: 0.3, ease: EASE_OUT },
                  }}
                  className="overflow-hidden"
                >
                  <p className="max-w-2xl pb-7 pr-10 text-[0.9375rem] leading-[1.65] text-ink-2">
                    {item.answer}
                  </p>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
