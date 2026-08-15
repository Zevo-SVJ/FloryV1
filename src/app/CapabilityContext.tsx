"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { authConfigured } from "@/lib/firebase/config";
import type { PublicConfig } from "@/lib/server/env";

/**
 * What this deployment can actually do.
 *
 * Blink has capabilities that depend on credentials: reading a real screenshot
 * needs a model, accounts need a Firebase project, connecting an Instagram
 * account needs an approved app. A build without them is not broken — it is a
 * smaller product, and it says so. What it must never do is offer a button that
 * cannot work.
 *
 * Auth is known synchronously from the public Firebase config, so it never
 * flickers. Analysis is a server fact, so it is fetched once and assumed
 * available until told otherwise — which keeps the upload step from flashing a
 * "demo only" notice on a deployment that is fully configured.
 */

export interface Capabilities extends PublicConfig {
  /** False until `/api/config` has answered. */
  known: boolean;
}

const FALLBACK: Capabilities = {
  analysis: "model",
  auth: "disabled",
  instagram: "unavailable",
  known: false,
};

const CapabilityContext = createContext<Capabilities>(FALLBACK);

export function CapabilityProvider({ children }: { children: ReactNode }) {
  const [capabilities, setCapabilities] = useState<Capabilities>(() => ({
    ...FALLBACK,
    auth: authConfigured() ? "firebase" : "disabled",
  }));

  useEffect(() => {
    const controller = new AbortController();

    void (async () => {
      try {
        const response = await fetch("/api/config", { signal: controller.signal });
        if (!response.ok) throw new Error(String(response.status));
        const config = (await response.json()) as PublicConfig;
        setCapabilities({ ...config, known: true });
      } catch {
        /* No config route means no server: a static export, an offline visit, a
           preview build. Analysis genuinely cannot run, so the interface offers
           the sample rather than a button that will fail after the upload. */
        setCapabilities((current) => ({
          ...current,
          analysis: "sample-only",
          known: true,
        }));
      }
    })();

    return () => controller.abort();
  }, []);

  return (
    <CapabilityContext.Provider value={capabilities}>
      {children}
    </CapabilityContext.Provider>
  );
}

export const useCapabilities = () => useContext(CapabilityContext);
