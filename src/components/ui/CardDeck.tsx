"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { DECK_RESIZE, DECK_SLIDE, EASE_OUT } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * The deck. Blink's one way of moving between things.
 *
 * Every sequence in the product — the stages of an analysis, the sections of a
 * report — is this component. One card is visible; the next is a sliver behind
 * it; a thumb drags them past each other with weight. Nothing fades into
 * anything unrelated, and nothing pops.
 *
 * Rules it enforces so callers cannot break them:
 *   · exactly one card occupies the frame, and every card is the same size
 *   · movement is horizontal, always, and always the same spring
 *   · the deck wraps, so there is no dead end in either direction
 *   · it is a real listbox: arrow keys work, and the position is announced
 *
 * Height is the caller's, and it animates. A card that opens changes the deck's
 * height for every card at once, so they stay identical to each other.
 */

export interface CardDeckProps {
  count: number;
  index: number;
  onIndexChange: (index: number) => void;
  /** Rendered for the active card and for the slivers either side. */
  children: (index: number, active: boolean) => ReactNode;
  /** The frame's height in pixels. Animated when it changes. */
  height: number;
  label: string;
  /** Off while an analysis is driving the deck itself. */
  interactive?: boolean;
  className?: string;
}

/** How far a card must travel, or how fast, before the deck commits. */
const COMMIT_DISTANCE = 0.28;
const COMMIT_VELOCITY = 420;

const wrap = (value: number, count: number) => ((value % count) + count) % count;

export function CardDeck({
  count,
  index,
  onIndexChange,
  children,
  height,
  label,
  interactive = true,
  className,
}: CardDeckProps) {
  const uid = useId();
  const frameRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [dragging, setDragging] = useState(false);
  const x = useMotionValue(0);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(entry.contentRect.width);
    });
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  const go = useCallback(
    (delta: number) => onIndexChange(wrap(index + delta, count)),
    [index, count, onIndexChange],
  );

  const settle = useCallback(
    (offset: number, velocity: number) => {
      setDragging(false);
      const travelled = width > 0 ? offset / width : 0;

      if (travelled < -COMMIT_DISTANCE || velocity < -COMMIT_VELOCITY) go(1);
      else if (travelled > COMMIT_DISTANCE || velocity > COMMIT_VELOCITY) go(-1);

      x.set(0);
    },
    [width, go, x],
  );

  /* The card behind lifts and squares up as the front card is dragged away, so
     the two are visibly connected rather than crossfading. */
  const travel = useTransform(x, (value) => (width > 0 ? value / width : 0));
  const backScale = useTransform(travel, [-1, 0, 1], [1, 0.94, 1]);
  const backOpacity = useTransform(travel, [-1, 0, 1], [1, 0.55, 1]);

  const slots = count <= 1 ? [0] : [-1, 0, 1];

  return (
    <div className={cn("relative", className)}>
      <motion.div
        ref={frameRef}
        role="listbox"
        aria-label={label}
        aria-orientation="horizontal"
        tabIndex={interactive ? 0 : -1}
        onKeyDown={(event) => {
          if (!interactive) return;
          if (event.key === "ArrowRight") {
            event.preventDefault();
            go(1);
          } else if (event.key === "ArrowLeft") {
            event.preventDefault();
            go(-1);
          }
        }}
        className="relative outline-none"
        animate={{ height }}
        transition={DECK_RESIZE}
        style={{ height }}
      >
        {slots.map((slot) => {
          const cardIndex = wrap(index + slot, count);
          const active = slot === 0;

          return (
            <motion.div
              key={`${uid}-${slot}`}
              role="option"
              id={`${uid}-card-${slot}`}
              aria-selected={active}
              className={cn(
                "absolute inset-0",
                active ? "z-[2]" : "z-[1]",
                active && interactive ? "cursor-grab active:cursor-grabbing" : null,
                !active && "pointer-events-none",
              )}
              style={
                active
                  ? { x }
                  : {
                      x: 0,
                      scale: backScale,
                      opacity: backOpacity,
                      // Behind cards sit slightly back, never beside.
                      transformOrigin: "center",
                    }
              }
              drag={active && interactive ? "x" : false}
              dragElastic={0.16}
              dragMomentum={false}
              dragConstraints={{ left: 0, right: 0 }}
              onDragStart={() => setDragging(true)}
              onDragEnd={(_, info) => settle(info.offset.x, info.velocity.x)}
              /* The incoming card is placed where it came from and released; it
                 is never faded in from nowhere. */
              initial={active ? { opacity: 0, scale: 0.965 } : false}
              animate={active ? { opacity: 1, scale: 1 } : undefined}
              transition={dragging ? { duration: 0 } : DECK_SLIDE}
            >
              {children(cardIndex, active)}
            </motion.div>
          );
        })}
      </motion.div>

      {interactive && count > 1 ? (
        <DeckRail count={count} index={index} onSelect={onIndexChange} />
      ) : null}
    </div>
  );
}

/**
 * Where you are in the deck.
 *
 * Dashes rather than dots: at eight or nine cards a row of dots turns into
 * texture, and the active dash reads as a position on a track.
 */
export function DeckRail({
  count,
  index,
  onSelect,
  className,
}: {
  count: number;
  index: number;
  onSelect?: (index: number) => void;
  className?: string;
}) {
  return (
    <div className={cn("mt-5 flex items-center justify-center gap-1.5", className)}>
      {Array.from({ length: count }, (_, position) => {
        const active = position === index;
        const Element = onSelect ? motion.button : motion.span;

        return (
          <Element
            key={position}
            {...(onSelect
              ? {
                  type: "button" as const,
                  onClick: () => onSelect(position),
                  "aria-label": `Card ${position + 1} of ${count}`,
                  "aria-current": active,
                }
              : { "aria-hidden": true })}
            className={cn(
              "h-1 rounded-full",
              active ? "bg-accent" : "bg-edge-strong",
              onSelect ? "cursor-pointer" : null,
            )}
            animate={{ width: active ? 20 : 6, opacity: active ? 1 : 0.85 }}
            transition={{ duration: 0.34, ease: EASE_OUT }}
          />
        );
      })}
    </div>
  );
}
