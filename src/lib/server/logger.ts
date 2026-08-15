import { serverEnv } from "@/lib/server/env";

/**
 * Structured logging, one line per event.
 *
 * Deliberately plain: JSON to stdout, which is what every host this could run
 * on already collects. Every analysis carries a request id so a slow run or a
 * refusal can be followed from the route through the model and back.
 */

type Level = "debug" | "info" | "warn" | "error";

const RANK: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const threshold = RANK[(serverEnv.logLevel as Level) in RANK ? (serverEnv.logLevel as Level) : "info"];

type Fields = Record<string, unknown>;

function emit(level: Level, event: string, fields: Fields) {
  if (RANK[level] < threshold) return;

  const line = JSON.stringify({
    at: new Date().toISOString(),
    level,
    event,
    ...fields,
  });

  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const log = {
  debug: (event: string, fields: Fields = {}) => emit("debug", event, fields),
  info: (event: string, fields: Fields = {}) => emit("info", event, fields),
  warn: (event: string, fields: Fields = {}) => emit("warn", event, fields),
  error: (event: string, fields: Fields = {}) => emit("error", event, fields),
};

/** A logger bound to one request, so every line it writes is correlated. */
export function requestLogger(requestId: string) {
  const start = Date.now();
  const with_ = (fields: Fields) => ({ requestId, ms: Date.now() - start, ...fields });

  return {
    requestId,
    debug: (event: string, fields: Fields = {}) => log.debug(event, with_(fields)),
    info: (event: string, fields: Fields = {}) => log.info(event, with_(fields)),
    warn: (event: string, fields: Fields = {}) => log.warn(event, with_(fields)),
    error: (event: string, fields: Fields = {}) => log.error(event, with_(fields)),
  };
}

export type RequestLogger = ReturnType<typeof requestLogger>;

export const newRequestId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10);
