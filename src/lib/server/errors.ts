/**
 * Failures worth naming.
 *
 * Every one of these carries a message written for the person who uploaded the
 * screenshot, not for the developer reading the stack. `code` is what the
 * client branches on; `message` is what it shows.
 */

export type ErrorCode =
  | "invalid_request"
  | "unsupported_image"
  | "not_a_profile"
  | "too_large"
  | "rate_limited"
  | "not_configured"
  | "model_refused"
  | "model_unavailable"
  | "internal";

const STATUS: Record<ErrorCode, number> = {
  invalid_request: 400,
  unsupported_image: 415,
  not_a_profile: 422,
  too_large: 413,
  rate_limited: 429,
  not_configured: 503,
  model_refused: 422,
  model_unavailable: 502,
  internal: 500,
};

export class AnalysisError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  /** Seconds until a retry could succeed, where that is knowable. */
  readonly retryAfter: number | null;

  constructor(code: ErrorCode, message: string, retryAfter: number | null = null) {
    super(message);
    this.name = "AnalysisError";
    this.code = code;
    this.status = STATUS[code];
    this.retryAfter = retryAfter;
  }
}

export const isAnalysisError = (value: unknown): value is AnalysisError =>
  value instanceof AnalysisError;

/** The wire shape for a failed request. Mirrored by the client's parser. */
export interface ErrorBody {
  error: { code: ErrorCode; message: string; requestId: string };
}

export function errorBody(error: AnalysisError, requestId: string): ErrorBody {
  return { error: { code: error.code, message: error.message, requestId } };
}
