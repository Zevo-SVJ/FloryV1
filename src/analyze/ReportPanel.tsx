"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAnalyze } from "@/analyze/AnalyzeContext";
import { ScoreReveal } from "@/components/report/ScoreReveal";
import { ReportCardView, reportCards } from "@/components/report/ReportCards";
import { Button } from "@/components/ui/Button";
import { CardDeck } from "@/components/ui/CardDeck";
import { IconRefresh } from "@/components/ui/Icons";
import { Label } from "@/components/ui/Reveal";
import { EASE_OUT } from "@/lib/motion";
import type { PerceptionReport } from "@/types/report";

/**
 * The report.
 *
 * Two screens, and the order between them is the whole design. First the score,
 * alone, not in a card — the moment the wait was for. Only once that has been
 * felt does the report become a deck, and from then on it is the same deck the
 * analysis used: same frame, same spring, same thumb gesture.
 *
 * There is no long scrolling page. A report is fifteen ideas, and fifteen ideas
 * read one at a time get read; fifteen ideas stacked vertically get skimmed.
 */

export function ReportPanel({
  report,
  previewUrl,
  titleId,
}: {
  report: PerceptionReport;
  previewUrl: string | null;
  titleId: string;
}) {
  const { again, close } = useAnalyze();
  const [reading, setReading] = useState(false);
  const [index, setIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);

  const cards = useMemo(() => reportCards(report), [report]);
  const current = cards[index] ?? cards[0]!;

  /* The deck is sized to the room it has rather than to a constant. A card that
     opens takes the whole surface; the collapsed card is a comfortable fraction
     of it. Every card is still identical to every other card, which is the rule
     that matters — they are identical to each other, and they change together. */
  const [room, setRoom] = useState(0);
  const watcher = useRef<ResizeObserver | null>(null);

  /* A callback ref rather than an effect: the deck is mounted by
     AnimatePresence after the score screen has finished leaving, so an effect
     keyed on `reading` would run while this node does not exist yet. */
  const roomRef = useCallback((element: HTMLDivElement | null) => {
    watcher.current?.disconnect();
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setRoom(entry.contentRect.height);
    });
    observer.observe(element);
    watcher.current = observer;
  }, []);

  useEffect(() => () => watcher.current?.disconnect(), []);

  const available = Math.max(240, room - 40);
  const height = expanded ? available : Math.min(available, 320);

  const move = (next: number) => {
    setIndex(next);
    // A card that opens stays open only as long as it is the card in front.
    setExpanded(false);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <h2 id={titleId} className="sr-only">
        Your perception report
      </h2>

      <AnimatePresence mode="wait" initial={false}>
        {!reading ? (
          <motion.div
            key="score"
            className="flex min-h-0 flex-1 flex-col"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.985 }}
            transition={{ duration: 0.4, ease: EASE_OUT }}
          >
            <ScoreReveal
              report={report}
              previewUrl={previewUrl}
              onContinue={() => setReading(true)}
            />
          </motion.div>
        ) : (
          <motion.div
            key="deck"
            className="flex min-h-0 flex-1 flex-col"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE_OUT }}
          >
            <div className="flex items-center gap-3 border-b border-edge bg-white px-5 py-3.5 pr-14 sm:px-8 sm:pr-16">
              <Label className="flex-1">Perception report</Label>
              <button
                type="button"
                onClick={() => setReading(false)}
                className="display text-[0.9375rem] font-semibold text-ink transition-opacity hover:opacity-60"
              >
                <span className="tabular">{report.overall}</span>
                <span className="ml-0.5 text-[0.6875rem] font-medium text-ink-4">
                  /100
                </span>
              </button>
            </div>

            <div className="flex min-h-0 flex-1 flex-col brand-wash bg-canvas px-5 sm:px-8">
              <div
                ref={roomRef}
                className="flex min-h-0 flex-1 flex-col justify-center py-6"
              >
                <div className="mx-auto w-full max-w-xl">
                  <CardDeck
                    count={cards.length}
                    index={index}
                    onIndexChange={move}
                    height={height}
                    label="Report sections"
                  >
                    {(cardIndex, active) => (
                      <ReportCardView
                        model={cards[cardIndex]!}
                        active={active}
                        expanded={active && expanded}
                        onToggle={() => setExpanded((open) => !open)}
                      />
                    )}
                  </CardDeck>
                </div>
              </div>

              <div className="mx-auto w-full max-w-xl shrink-0 pb-6">
                <p className="text-center text-[0.8125rem] text-ink-4">
                  {current.kind === "metric"
                    ? "Swipe for the next dimension. Tap the card for the detail."
                    : "Swipe to keep reading."}
                </p>

                <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                  <Button
                    variant="secondary"
                    onClick={again}
                    trailing={<IconRefresh className="h-4 w-4" />}
                  >
                    Analyze another profile
                  </Button>
                  <Button variant="ghost" onClick={close}>
                    Done
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
