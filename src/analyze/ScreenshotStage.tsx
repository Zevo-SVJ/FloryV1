"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { SubjectCard } from "@/components/profile/SubjectProfile";
import { dominantColours } from "@/lib/analysis/palette";
import { BANDS, type RegionKey } from "@/lib/analysis/pipeline";
import { EASE_IN_OUT, EASE_OUT } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * The screenshot, while it is being read.
 *
 * It never disappears and it is never replaced by a graphic of itself. What
 * changes is where the light is: everything outside the band under examination
 * recedes, the band's leading edge carries a single line in the brand's blue,
 * and the whole frame breathes very slightly.
 *
 * A band rather than a box, for the reason given in `analysis/pipeline.ts`:
 * Blink knows the reading order of a profile, not the pixel coordinates of one
 * particular screenshot. The veils are feathered rather than hard-edged so the
 * band reads as attention moving down the page — which is true — instead of a
 * rectangle claiming to know exactly where someone's face is, which is not.
 *
 * No scan lines, no grids, no crosshairs, no green. It should look like someone
 * holding your photograph under a lamp and moving the lamp.
 */

const VEIL = "rgba(10, 12, 22, 0.4)";
const CLEAR = "rgba(10, 12, 22, 0)";

export function ScreenshotStage({
  previewUrl,
  region,
  /** Sampled swatches appear only during the colour stage. */
  showPalette,
  finished,
  className,
}: {
  previewUrl: string | null;
  region: RegionKey;
  showPalette: boolean;
  finished: boolean;
  className?: string;
}) {
  const band = BANDS[region];
  const whole = region === "whole";
  const [palette, setPalette] = useState<string[]>([]);

  /* Sampled from the actual pixels on screen, once, on the device. The model
     does its own better version for the report; this is here so what the person
     is watching is true rather than illustrative. */
  useEffect(() => {
    if (!previewUrl) return;
    let live = true;
    void dominantColours(previewUrl, 4).then((colours) => {
      if (live) setPalette(colours);
    });
    return () => {
      live = false;
    };
  }, [previewUrl]);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-card border border-edge bg-sunken",
        className,
      )}
    >
      {/* The subject itself. Present from the first frame to the last. */}
      <motion.div
        className="absolute inset-0 overflow-hidden"
        animate={{ scale: finished ? 1.015 : 1 }}
        transition={{ duration: 1.1, ease: EASE_OUT }}
      >
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt="The screenshot being analysed"
            className="h-full w-full object-cover object-top"
          />
        ) : (
          <SampleSubject />
        )}
      </motion.div>

      {/* Everything outside the band recedes. Feathered, so the boundary is a
          gradient of attention rather than a claim about coordinates. */}
      <motion.div
        className="pointer-events-none absolute inset-x-0 top-0"
        style={{
          backgroundImage: `linear-gradient(to bottom, ${VEIL} 0%, ${VEIL} 68%, ${CLEAR} 100%)`,
        }}
        animate={{ height: `${band.from * 100}%`, opacity: whole ? 0.14 : 1 }}
        transition={{ duration: 0.9, ease: EASE_IN_OUT }}
        aria-hidden
      />
      <motion.div
        className="pointer-events-none absolute inset-x-0 bottom-0"
        style={{
          backgroundImage: `linear-gradient(to top, ${VEIL} 0%, ${VEIL} 68%, ${CLEAR} 100%)`,
        }}
        animate={{ height: `${(1 - band.to) * 100}%`, opacity: whole ? 0.14 : 1 }}
        transition={{ duration: 0.9, ease: EASE_IN_OUT }}
        aria-hidden
      />

      {/* The lamp's edge. One line, in the brand's blue, that travels. */}
      <motion.div
        className="pointer-events-none absolute inset-x-0 h-px bg-accent"
        style={{ boxShadow: "0 0 14px 1px rgba(11, 92, 251, 0.4)" }}
        animate={{ top: `${band.from * 100}%`, opacity: whole ? 0 : 0.85 }}
        transition={{ duration: 0.9, ease: EASE_IN_OUT }}
        aria-hidden
      />

      {/* The colours, once they have actually been sampled. */}
      <AnimatePresence>
        {showPalette && palette.length > 0 ? (
          <motion.div
            className="absolute inset-x-0 bottom-0 flex items-center gap-2 px-4 pb-4 pt-10"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.5, ease: EASE_OUT }}
            aria-hidden
          >
            {palette.map((colour, index) => (
              <motion.span
                key={`${colour}-${index}`}
                className="h-7 w-7 rounded-full ring-2 ring-white/85"
                style={{ backgroundColor: colour }}
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.44, delay: index * 0.08, ease: EASE_OUT }}
              />
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* The overlap motif, borrowed from the mark: what is there, and how it is
          seen. Barely visible, and it closes as the analysis completes. */}
      <motion.div
        className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-azure/20 mix-blend-screen blur-2xl"
        animate={{ opacity: finished ? 0 : [0.5, 0.85, 0.5] }}
        transition={
          finished
            ? { duration: 0.8, ease: EASE_OUT }
            : { duration: 4.6, repeat: Infinity, ease: "easeInOut" }
        }
        aria-hidden
      />
    </div>
  );
}

/**
 * The stand-in for a sample run.
 *
 * Scaled to fit the frame exactly, because the bands above are fractions of the
 * frame: a card that overflows would put the lamp on the wrong part of the
 * profile, and the one thing this screen must get right is that it is looking
 * where it says it is looking.
 */
function SampleSubject() {
  const frameRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const frame = frameRef.current;
    const card = cardRef.current;
    if (!frame || !card) return;

    const fit = () => {
      // offsetHeight ignores the transform, so this stays stable as it changes.
      const natural = card.offsetHeight;
      const naturalWidth = card.offsetWidth;
      if (!natural || !naturalWidth) return;
      setScale(
        Math.min(
          frame.clientHeight / natural,
          frame.clientWidth / naturalWidth,
        ),
      );
    };

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={frameRef}
      className="flex h-full w-full items-center justify-center overflow-hidden bg-canvas"
    >
      <div ref={cardRef} style={{ transform: `scale(${scale})` }}>
        <SubjectCard rows={3} />
      </div>
    </div>
  );
}
