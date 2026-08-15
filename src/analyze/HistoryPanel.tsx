"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAnalyze } from "@/analyze/AnalyzeContext";
import { useAuth } from "@/auth/AuthContext";
import { Button } from "@/components/ui/Button";
import { IconArrowRight } from "@/components/ui/Icons";
import { Label } from "@/components/ui/Reveal";
import { accountStore, deviceStore } from "@/lib/data/analyses";
import type { AnalysisSummary } from "@/lib/data/schema";
import { EASE_OUT } from "@/lib/motion";

/**
 * Everything you have run.
 *
 * The point of history is comparison: the report is a set of instructions, and
 * the only way to know whether they worked is to run it again a month later and
 * look at the two numbers. So the list leads with the score and the date, and
 * every row reopens the full report in the same surface it was first read in.
 */

function when(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export function HistoryPanel({ titleId }: { titleId: string }) {
  const { user, status } = useAuth();
  const { reopen, open } = useAnalyze();
  const [rows, setRows] = useState<AnalysisSummary[] | null>(null);

  const store = user ? accountStore(user.uid) : deviceStore;

  useEffect(() => {
    let live = true;
    void store
      .list()
      .then((list) => live && setRows(list))
      .catch(() => live && setRows([]));
    return () => {
      live = false;
    };
    // The store is derived from the uid; re-listing on identity change is the point.
  }, [user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  const load = useCallback(
    async (id: string) => {
      const report = await store.get(id);
      if (report) reopen(report);
    },
    [store, reopen],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-3 border-b border-edge bg-white px-5 py-3.5 pr-14 sm:px-8 sm:pr-16">
        <Label className="flex-1">Your analyses</Label>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-canvas px-5 py-6 sm:px-8">
        <h2 id={titleId} className="sr-only">
          Your previous analyses
        </h2>

        {rows === null ? (
          <SkeletonRows />
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <p className="display text-[1.25rem] tracking-[-0.028em]">
              Nothing here yet
            </p>
            <p className="mt-3 max-w-xs text-[0.9375rem] leading-relaxed text-ink-3">
              Run your first analysis and it will be waiting here the next time
              you come back.
            </p>
            <Button
              className="mt-7"
              onClick={open}
              trailing={<IconArrowRight className="h-4 w-4" />}
            >
              Analyze a profile
            </Button>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {rows.map((row, index) => (
              <motion.li
                key={row.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: index * 0.045, ease: EASE_OUT }}
              >
                <button
                  type="button"
                  onClick={() => void load(row.id)}
                  className="flex w-full items-center gap-4 rounded-card border border-edge bg-white px-4 py-4 text-left shadow-rest transition-colors hover:border-edge-strong"
                >
                  <span className="display tabular w-12 shrink-0 text-[1.5rem] font-semibold leading-none tracking-[-0.04em]">
                    {row.overall}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.9375rem] font-medium tracking-[-0.012em]">
                      {row.archetype}
                    </span>
                    <span className="mt-1 block truncate text-[0.8125rem] text-ink-3">
                      {row.headline}
                    </span>
                  </span>
                  <span className="shrink-0 text-[0.75rem] text-ink-4">
                    {when(row.createdAt)}
                  </span>
                </button>
              </motion.li>
            ))}
          </ul>
        )}

        {rows !== null && rows.length > 0 && status !== "signed-in" ? (
          <p className="mt-6 text-center text-[0.75rem] leading-relaxed text-ink-4">
            These are kept on this device. Sign in and they follow you to your
            phone.
          </p>
        ) : null}
      </div>
    </div>
  );
}

/** Placeholder rows at the real rows' dimensions, so nothing jumps on load. */
function SkeletonRows() {
  return (
    <ul className="space-y-2.5" aria-hidden>
      {[0, 1, 2].map((index) => (
        <li
          key={index}
          className="h-[4.75rem] animate-pulse rounded-card border border-edge bg-white"
          style={{ animationDelay: `${index * 120}ms` }}
        />
      ))}
    </ul>
  );
}
