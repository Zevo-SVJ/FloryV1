"use client";

import type { ReactNode } from "react";
import { MotionConfig } from "framer-motion";
import { AnalyzeProvider } from "@/analyze/AnalyzeContext";

/**
 * One motion policy and one flow, for the whole product.
 *
 * `reducedMotion="user"` means every transform and layout animation is skipped
 * automatically when the visitor's system asks for less movement — they still
 * get the content, the states and the numbers, just no travel.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <AnalyzeProvider>{children}</AnalyzeProvider>
    </MotionConfig>
  );
}
