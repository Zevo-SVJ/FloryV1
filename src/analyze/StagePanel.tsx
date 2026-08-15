"use client";

import { useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { useAnalyze } from "@/analyze/AnalyzeContext";
import { ScreenshotStage } from "@/analyze/ScreenshotStage";
import { BlinkGlyph } from "@/components/brand/Brand";
import { Card, CardBody } from "@/components/ui/Card";
import { CardDeck } from "@/components/ui/CardDeck";
import { Label } from "@/components/ui/Reveal";
import { useAnalysisClock } from "@/hooks/useAnalysisClock";
import { useReducedMotionSafe } from "@/hooks/useReducedMotionSafe";
import { STAGES } from "@/lib/analysis/pipeline";
import { EASE_OUT } from "@/lib/motion";

/**
 * The analysis, while it happens.
 *
 * Two things on screen and nothing else: the screenshot, which stays in frame
 * from the first stage to the last, and one card. The card is the same card that carries every section of the report
 * afterwards — same frame, same radius, same spring — so the read and the result
 * are visibly one object rather than two screens.
 *
 * There is no spinner and no percentage. The deck's position is the progress
 * indicator, which is honest, because the deck is genuinely walking the stages
 * the model was asked to work through.
 */

const DECK_HEIGHT = 178;

export function StagePanel({ titleId }: { titleId: string }) {
  const { previewUrl, startedAt, expectedMs, finishedAt, reveal, cancel } =
    useAnalyze();
  const reduced = useReducedMotionSafe();

  const onComplete = useCallback(() => reveal(), [reveal]);

  const clock = useAnalysisClock({
    startedAt,
    expectedMs,
    resultAt: finishedAt,
    onComplete,
    reduced,
  });

  const stage = STAGES[clock.stage] ?? STAGES[0]!;
  const region = clock.complete ? "whole" : stage.region;

  const heading = useMemo(
    () => (clock.complete ? "Building your report" : "Reading your profile"),
    [clock.complete],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-3 border-b border-edge bg-white px-5 py-3.5 pr-14 sm:px-8 sm:pr-16">
        <BlinkGlyph size={18} className="text-accent" />
        <Label className="flex-1">{heading}</Label>
        <span className="tabular text-[0.75rem] text-ink-4">
          {Math.min(clock.stage + 1, STAGES.length)} / {STAGES.length}
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto brand-wash bg-canvas px-5 py-6 sm:px-8 sm:py-8">
        <h2 id={titleId} className="sr-only">
          Blink is reading your profile
        </h2>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1fr)] lg:gap-9">
          <ScreenshotStage
            previewUrl={previewUrl}
            region={region}
            showPalette={stage.id === "palette"}
            finished={clock.complete}
            className="h-[38svh] min-h-[240px] lg:h-full lg:min-h-[380px]"
          />

          <div className="flex flex-col justify-center">
            <CardDeck
              count={STAGES.length}
              index={clock.stage}
              onIndexChange={() => {}}
              height={DECK_HEIGHT}
              label="Analysis stages"
              interactive={false}
            >
              {(index, active) => {
                const card = STAGES[index]!;
                return (
                  <Card>
                    <CardBody className="justify-between">
                      <div>
                        <div className="flex items-baseline gap-2.5">
                          <span className="tabular text-[0.75rem] font-medium text-accent">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          <h3 className="display text-[1.25rem] leading-none tracking-[-0.028em]">
                            {card.title}
                          </h3>
                        </div>
                        <p className="mt-3 max-w-[34ch] text-[0.9375rem] leading-relaxed text-ink-3">
                          {card.line}
                        </p>
                      </div>

                      {/* The stage's own share of the run, filling in place. */}
                      <StageRule active={active && !clock.complete} />
                    </CardBody>
                  </Card>
                );
              }}
            </CardDeck>

            <div className="mt-7 flex flex-col items-center gap-2.5">
              <motion.p
                className="text-center text-[0.8125rem] leading-relaxed text-ink-4"
                animate={{ opacity: 1 }}
                initial={{ opacity: 0 }}
                transition={{ duration: 0.5, ease: EASE_OUT }}
              >
                {clock.complete
                  ? "Laying out your report."
                  : clock.overtime
                    ? "This one is taking a little longer. Still reading."
                    : "Your screenshot stays on screen the whole time."}
              </motion.p>
              <button
                type="button"
                onClick={cancel}
                className="rounded-full px-3 py-1.5 text-[0.8125rem] text-ink-4 transition-colors hover:bg-sunken hover:text-ink-2"
              >
                Stop
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * The one moving part on a card.
 *
 * A rule that fills while its stage is the current stage. It is not a progress
 * bar for the run — it is this card's own turn, which is why it resets with each
 * card rather than accumulating.
 */
function StageRule({ active }: { active: boolean }) {
  return (
    <div className="mt-5 h-[3px] w-full overflow-hidden rounded-full bg-sunken" aria-hidden>
      <motion.div
        className="brand-gradient h-full rounded-full"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: active ? 1 : 0 }}
        style={{ originX: 0 }}
        transition={{ duration: active ? 4.4 : 0.3, ease: [0.32, 0.12, 0.2, 1] }}
      />
    </div>
  );
}
