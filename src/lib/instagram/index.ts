import { unavailableProvider } from "@/lib/instagram/unavailable";
import type { InstagramProvider } from "@/lib/instagram/types";

export * from "@/lib/instagram/types";

/**
 * The Instagram integration, selected once.
 *
 * There is exactly one provider today and it is switched off. When the real one
 * arrives — a Graph API client holding a client id, a secret and a long-lived
 * token store — it is registered here and nothing else in the product changes,
 * because nothing else in the product imports a provider directly.
 *
 * The env switch exists so that the real provider can be introduced without
 * touching call sites, and so that a deployment without credentials keeps the
 * honest one.
 */

const PROVIDERS: Record<string, InstagramProvider> = {
  unavailable: unavailableProvider,
};

export function instagram(): InstagramProvider {
  const requested = process.env.INSTAGRAM_PROVIDER?.trim();
  return (requested && PROVIDERS[requested]) || unavailableProvider;
}
