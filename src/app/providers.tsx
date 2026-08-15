"use client";

import type { ReactNode } from "react";
import { MotionConfig } from "framer-motion";
import { AnalyzeProvider } from "@/analyze/AnalyzeContext";
import { AuthProvider } from "@/auth/AuthContext";
import { CapabilityProvider } from "@/app/CapabilityContext";

/**
 * One motion policy, one identity, one flow.
 *
 * Order matters: the flow needs to know who is signed in (to store a report
 * against their account) and what the deployment can do (to refuse honestly
 * rather than fail), so both sit above it.
 *
 * `reducedMotion="user"` means every transform and layout animation is skipped
 * automatically when the visitor's system asks for less movement — they still
 * get the content, the states and the numbers, just no travel.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <CapabilityProvider>
        <AuthProvider>
          <AnalyzeProvider>{children}</AnalyzeProvider>
        </AuthProvider>
      </CapabilityProvider>
    </MotionConfig>
  );
}
