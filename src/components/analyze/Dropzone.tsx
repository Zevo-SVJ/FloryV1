"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { UploadIllustration } from "@/components/analyze/UploadIllustration";
import { Button } from "@/components/ui/Button";
import { IconArrowRight, IconClose, IconImage } from "@/components/ui/Icons";
import { EASE_OUT } from "@/lib/motion";
import { cn, formatBytes } from "@/lib/utils";

const ACCEPTED = ["image/png", "image/jpeg", "image/webp", "image/heic"];
const MAX_BYTES = 12 * 1024 * 1024;

export interface SelectedFile {
  file: File;
  previewUrl: string;
}

interface DropzoneProps {
  onAnalyze: (selection: SelectedFile) => void;
  onUseSample: () => void;
}

export function Dropzone({ onAnalyze, onUseSample }: DropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [selection, setSelection] = useState<SelectedFile | null>(null);
  const [error, setError] = useState<string | null>(null);

  // The preview URL outlives this component — the report shows it too — so it
  // is released when a selection is replaced or cleared, never on unmount.
  const accept = useCallback((file: File | undefined) => {
    if (!file) return;

    if (!ACCEPTED.includes(file.type) && !file.type.startsWith("image/")) {
      setError("That is not an image. A screenshot works best.");
      return;
    }

    if (file.size > MAX_BYTES) {
      setError(`That file is ${formatBytes(file.size)}. Keep it under 12 MB.`);
      return;
    }

    setError(null);
    setSelection((previous) => {
      if (previous) URL.revokeObjectURL(previous.previewUrl);
      return { file, previewUrl: URL.createObjectURL(file) };
    });
  }, []);

  // Screenshots usually live on the clipboard, so accept a paste anywhere.
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const item = Array.from(event.clipboardData?.files ?? [])[0];
      if (item) accept(item);
    };

    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [accept]);

  const clear = () => {
    if (selection) URL.revokeObjectURL(selection.previewUrl);
    setSelection(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="w-full">
      <motion.div
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
          borderColor: dragging ? "var(--color-accent)" : "var(--color-line-strong)",
          backgroundColor: dragging ? "var(--color-accent-wash)" : "var(--color-surface)",
          scale: dragging ? 1.006 : 1,
        }}
        transition={{ duration: 0.35, ease: EASE_OUT }}
        className="relative overflow-hidden rounded-panel border border-dashed"
      >
        <AnimatePresence mode="wait">
          {selection ? (
            <motion.div
              key="selected"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.5, ease: EASE_OUT }}
              className="flex flex-col items-center gap-8 px-6 py-12 sm:px-10 sm:py-14"
            >
              <div className="relative">
                <motion.img
                  src={selection.previewUrl}
                  alt="The screenshot you selected"
                  className="max-h-[280px] w-auto rounded-[18px] border border-line object-contain shadow-panel"
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.7, ease: EASE_OUT }}
                />
                <button
                  type="button"
                  onClick={clear}
                  aria-label="Remove screenshot"
                  className="absolute -right-3 -top-3 flex h-8 w-8 items-center justify-center rounded-full border border-line bg-surface text-ink-muted shadow-lift transition-colors hover:text-ink"
                >
                  <IconClose className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="text-center">
                <p className="text-[0.9375rem] font-medium tracking-tight">
                  {selection.file.name}
                </p>
                <p className="mt-1.5 text-[0.8125rem] text-ink-muted">
                  {formatBytes(selection.file.size)} · stays on your device
                </p>
              </div>

              <Button
                size="lg"
                onClick={() => onAnalyze(selection)}
                trailing={<IconArrowRight className="h-4 w-4" />}
              >
                Analyze this profile
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.5, ease: EASE_OUT }}
              className="px-6 py-14 sm:px-10 sm:py-20"
            >
              <div className="flex flex-col items-center text-center">
                <UploadIllustration active={dragging} />

                <p className="mt-8 text-title font-medium">
                  Drop your profile screenshot
                </p>
                <p className="mt-4 max-w-sm text-[0.9375rem] leading-relaxed text-ink-muted">
                  A full screenshot of your Instagram profile — photo, bio,
                  highlights and the first rows of your grid.
                </p>

                <div className="mt-9 flex flex-col items-center gap-4 sm:flex-row">
                  <Button
                    size="lg"
                    onClick={() => inputRef.current?.click()}
                    trailing={<IconImage className="h-4 w-4" />}
                  >
                    Choose screenshot
                  </Button>
                  <button
                    type="button"
                    onClick={onUseSample}
                    className="text-[0.9375rem] font-medium text-ink-muted underline decoration-line-strong decoration-1 underline-offset-4 transition-colors hover:text-ink hover:decoration-ink/40"
                  >
                    Or see a sample report
                  </button>
                </div>

                <p className="mt-9 text-[0.8125rem] text-ink-faint">
                  PNG, JPG or WebP · paste works too · nothing leaves your device
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

      <div className="flex min-h-8 items-center justify-center">
        <AnimatePresence>
          {error ? (
            <motion.p
              role="alert"
              className={cn("mt-4 text-[0.875rem] text-accent")}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: EASE_OUT }}
            >
              {error}
            </motion.p>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
