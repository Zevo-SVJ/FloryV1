/**
 * Server configuration, read once and reported honestly.
 *
 * Blink has two capabilities that depend on credentials it may not have: real
 * analysis (an Anthropic key) and accounts (a Firebase project). Neither is
 * simulated when its key is missing. The product says so instead, which is why
 * this file exposes what is configured rather than throwing on import.
 */

function read(name: string): string | null {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value.trim() : null;
}

function int(name: string, fallback: number): number {
  const raw = read(name);
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const serverEnv = {
  anthropicApiKey: read("ANTHROPIC_API_KEY"),
  /** Overridable so the app can run against a gateway or a proxy. */
  anthropicBaseUrl: read("ANTHROPIC_BASE_URL"),
  model: read("BLINK_MODEL") ?? "claude-opus-5",
  /** Uploads above this are rejected before any decoding happens. */
  maxUploadBytes: int("BLINK_MAX_UPLOAD_BYTES", 8 * 1024 * 1024),
  /** Per-IP analyses allowed inside the window. */
  rateLimit: int("BLINK_RATE_LIMIT", 12),
  rateWindowMs: int("BLINK_RATE_WINDOW_MS", 10 * 60 * 1000),
  logLevel: read("BLINK_LOG_LEVEL") ?? (process.env.NODE_ENV === "production" ? "info" : "debug"),
} as const;

export const analysisConfigured = () => serverEnv.anthropicApiKey !== null;

/**
 * What the browser is allowed to know about the server's configuration.
 *
 * Surfaced through `GET /api/config` so the interface can tell the truth about
 * itself — a demo badge when there is no model, sign-in when there is a
 * Firebase project — without shipping any secret to the client.
 */
export interface PublicConfig {
  analysis: "model" | "sample-only";
  auth: "firebase" | "disabled";
  instagram: "available" | "unavailable";
}
