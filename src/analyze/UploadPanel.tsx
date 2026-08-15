"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAnalyze } from "@/analyze/AnalyzeContext";
import { PlatformNote } from "@/analyze/PlatformNote";
import { useCapabilities } from "@/app/CapabilityContext";
import { Button } from "@/components/ui/Button";
import { IconArrowRight, IconClose, IconLock, IconUpload } from "@/components/ui/Icons";
import { EASE_OUT } from "@/lib/motion";
import { cn, formatBytes } from "@/lib/utils";

const MAX_BYTES = 12 * 1024 * 1024;

/**
 * Step one of the flow.
 *
 * A target that responds to being approached: the frame tightens, the plate
 * lifts, the caption changes the moment a file is over it. Click, drag or
 * paste all work, because a screenshot is usually already on the clipboard.
 */
export function UploadPanel({ titleId }: { titleId: string }) {
  const { submit, runSample } = useAnalyze();
  const { analysis, known } = useCapabilities();
  // Only claim the model is missing once the server has actually said so.
  const sampleOnly = known && analysis !== "model";
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [picked, setPicked] = useState<{ file: File; url: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const accept = useCallback((file: File | undefined) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("That is not an image. A screenshot works best.");
      return;
    }

    if (file.size > MAX_BYTES) {
      setError(`That file is ${formatBytes(file.size)}. Keep it under 12 MB.`);
      return;
    }

    setError(null);
    setPicked((previous) => {
      if (previous) URL.revokeObjectURL(previous.url);
      return { file, url: URL.createObjectURL(file) };
    });
  }, []);

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const file = Array.from(event.clipboardData?.files ?? [])[0];
      if (file) accept(file);
    };

    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [accept]);

  const clear = () => {
    if (picked) URL.revokeObjectURL(picked.url);
    setPicked(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-7 pt-6 sm:px-9 sm:pb-9 sm:pt-10">
      <div className="text-center">
        <h2 id={titleId} className="display text-title">
          Upload your profile screenshot
        </h2>
        <p className="mx-auto mt-3 max-w-sm text-[0.9375rem] leading-relaxed text-ink-3">
          Blink reads it the way a stranger does and reports the impression it
          creates.
        </p>
      </div>

      {/* Hidden entirely where it cannot lead anywhere. A target that accepts a
          file and then does nothing with it is worse than no target. */}
      <motion.div
        hidden={sampleOnly}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          accept(event.dataTransfer.files[0]);
        }}
        animate={{
          borderColor: dragging ? "var(--color-accent)" : "var(--color-edge-strong)",
          backgroundColor: dragging ? "var(--color-accent-tint)" : "var(--color-canvas)",
        }}
        transition={{ duration: 0.3, ease: EASE_OUT }}
        className="mt-7 rounded-panel border border-dashed"
      >
        <AnimatePresence mode="wait">
          {picked ? (
            <motion.div
              key="picked"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4, ease: EASE_OUT }}
              className="flex flex-col items-center gap-6 px-5 py-8"
            >
              <div className="relative">
                {/* A blob: URL from the visitor's own device — nothing to optimise. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={picked.url}
                  alt="The screenshot you selected"
                  className="max-h-[38svh] w-auto rounded-card ring-1 ring-edge sm:max-h-[240px]"
                />
                <button
                  type="button"
                  onClick={clear}
                  aria-label="Remove screenshot"
                  className="absolute -right-2.5 -top-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-white text-ink-3 shadow-card ring-1 ring-edge transition-colors hover:text-ink"
                >
                  <IconClose className="h-3.5 w-3.5" />
                </button>
              </div>

              <p className="text-center text-[0.8125rem] text-ink-3">
                <span className="font-medium text-ink">{picked.file.name}</span>
                {" · "}
                {formatBytes(picked.file.size)}
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: EASE_OUT }}
              className="px-5 py-10 sm:py-12"
            >
              <div className="flex flex-col items-center text-center">
                <UploadPlate active={dragging} />

                <p className="mt-6 text-[1rem] font-medium tracking-[-0.015em]">
                  {dragging ? "Drop it anywhere here" : "Add your screenshot"}
                </p>
                <p className="mt-2 max-w-[19rem] text-[0.8125rem] leading-relaxed text-ink-3">
                  Photo, bio, saved collections and the first rows of your grid.
                </p>
                <p className="mt-4 text-[0.75rem] text-ink-4">
                  Tap below, drag it in, or paste it
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/heic"
          className="sr-only"
          onChange={(event) => accept(event.target.files?.[0])}
        />
      </motion.div>

      <div className="flex min-h-7 items-center justify-center">
        <AnimatePresence>
          {error ? (
            <motion.p
              role="alert"
              className="mt-3 text-[0.8125rem] text-low"
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: EASE_OUT }}
            >
              {error}
            </motion.p>
          ) : null}
        </AnimatePresence>
      </div>

      {/* A build with no model connected says so here, before anyone spends a
          screenshot on it. */}
      {sampleOnly ? (
        <p className="mt-3 rounded-card border border-edge bg-sunken px-4 py-3 text-center text-[0.8125rem] leading-relaxed text-ink-3">
          This build has no analysis model connected, so it cannot read your own
          screenshot yet. The sample report is the real thing, on a sample
          profile.
        </p>
      ) : null}

      <div className="mt-4 flex flex-col items-center gap-4">
        {/* One primary control: it picks a file until there is one, then reads
            it. A disabled button here would be a dead end on the first tap. */}
        {sampleOnly ? (
          <Button
            size="lg"
            block
            onClick={runSample}
            trailing={<IconArrowRight className="h-[1.05rem] w-[1.05rem]" />}
            className="sm:w-auto sm:px-9"
          >
            See the sample report
          </Button>
        ) : (
          <>
            <Button
              size="lg"
              block
              onClick={() => (picked ? submit(picked.file) : inputRef.current?.click())}
              leading={
                picked ? undefined : <IconUpload className="h-[1.05rem] w-[1.05rem]" />
              }
              trailing={
                picked ? <IconArrowRight className="h-[1.05rem] w-[1.05rem]" /> : undefined
              }
              className="sm:w-auto sm:px-9"
            >
              {picked ? "Read my first impression" : "Choose a screenshot"}
            </Button>

            <button
              type="button"
              onClick={runSample}
              className="text-[0.875rem] font-medium text-ink-3 underline decoration-edge-strong decoration-1 underline-offset-4 transition-colors hover:text-ink hover:decoration-ink/40"
            >
              Or try it on a sample profile
            </button>
          </>
        )}
      </div>

      <div className="mt-7 flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
        <PlatformNote />
        {/* The honest version. The screenshot is sent to the analysis model —
            saying otherwise would be the one lie this product cannot tell. */}
        <span className="inline-flex items-center gap-1.5 rounded-full bg-sunken px-3 py-1.5 text-[0.75rem] font-medium text-ink-2">
          <IconLock className="h-3 w-3 text-ink-3" />
          Read once, never stored
        </span>
      </div>

      <p className="mx-auto mt-3 max-w-sm text-center text-[0.75rem] leading-relaxed text-ink-4">
        Your screenshot is resized on this device, sent for analysis, and
        discarded when the report is written. Blink keeps the report, not the
        image.
      </p>
    </div>
  );
}

/**
 * The upload illustration: a screenshot lifting off a plate. Draws once, then
 * lifts and tilts while a file is held over the target.
 */
function UploadPlate({ active }: { active: boolean }) {
  return (
    <div className="relative h-[104px] w-[124px]">
      {/* the plate */}
      <motion.div
        className="absolute bottom-0 left-1/2 h-[74px] w-[92px] -translate-x-1/2 rounded-[14px] bg-sunken ring-1 ring-edge"
        animate={{ y: active ? 3 : 0 }}
        transition={{ duration: 0.5, ease: EASE_OUT }}
      />
      {/* the screenshot */}
      <motion.div
        className="absolute left-1/2 top-0 w-[84px] -translate-x-1/2 overflow-hidden rounded-[13px] bg-white p-2.5 shadow-card ring-1 ring-edge"
        animate={{
          y: active ? -8 : 0,
          rotate: active ? -2.4 : -1,
          scale: active ? 1.04 : 1,
        }}
        transition={{ duration: 0.5, ease: EASE_OUT }}
      >
        <div className="flex items-center gap-1.5">
          <span className="h-4 w-4 rounded-full bg-edge-strong" />
          <span className="flex-1 space-y-1">
            <span className="block h-[3px] w-full rounded-full bg-edge-strong" />
            <span className="block h-[3px] w-2/3 rounded-full bg-edge" />
          </span>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-[3px]">
          {Array.from({ length: 6 }, (_, index) => (
            <span
              key={index}
              className="block aspect-square rounded-[3px] bg-edge"
              style={{ opacity: 1 - index * 0.09 }}
            />
          ))}
        </div>
      </motion.div>

      {/* where attention lands */}
      <motion.span
        className={cn("absolute left-1/2 top-[18px] block h-1.5 w-1.5 rounded-full bg-accent")}
        style={{ marginLeft: -33 }}
        animate={{ scale: active ? 1.5 : 1, opacity: active ? 1 : 0.7 }}
        transition={{ duration: 0.4, ease: EASE_OUT }}
      />
    </div>
  );
}
