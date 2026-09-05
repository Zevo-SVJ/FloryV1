/**
 * What went wrong on the way back from an identity provider, in words.
 *
 * An OAuth failure arrives as query parameters on the redirect URI —
 * `error`, `error_code`, `error_description` — and every one of them is written
 * by somebody else's server. Two rules follow, and both are why this module
 * exists rather than the callback route rendering what it was handed:
 *
 *   1. The provider's text is never shown. It is mapped to one of a fixed set
 *      of keys here, the key travels in the redirect, and the sign-in page
 *      looks the sentence up. React would escape the raw string safely enough,
 *      but "safe to render" is not "ours to say" — a provider's prose in our
 *      typography reads as our copy, and an open redirect's cousin is an open
 *      message.
 *
 *   2. An unrecognised failure is still a failure. It maps to `unknown` and
 *      says something true and useless rather than nothing at all, because a
 *      silent bounce back to the sign-in form is the state people retry
 *      forever.
 */

export const AUTH_ERROR_KEYS = [
  "cancelled",
  "signup_disabled",
  "provider_unavailable",
  "link_expired",
  "exchange_failed",
  "not_configured",
  "unknown",
] as const;

export type AuthErrorKey = (typeof AUTH_ERROR_KEYS)[number];

const MESSAGES: Record<AuthErrorKey, string> = {
  cancelled: "Sign-in was cancelled. Nothing happened to your account.",
  signup_disabled:
    "That Google account has no access to LOCK, and new accounts are closed.",
  provider_unavailable: "Google could not be reached. Try again in a moment.",
  link_expired: "That link has expired. Ask for a new one, or sign in with your password.",
  exchange_failed: "That sign-in could not be completed. Try again.",
  not_configured: "LOCK is not connected to a database yet.",
  unknown: "That sign-in did not complete. Try again.",
};

const isAuthErrorKey = (value: string): value is AuthErrorKey =>
  (AUTH_ERROR_KEYS as readonly string[]).includes(value);

/** The sentence for a key, or nothing when the parameter is absent or invented. */
export function authErrorMessage(value: string | null | undefined): string | null {
  if (!value) return null;
  return isAuthErrorKey(value) ? MESSAGES[value] : MESSAGES.unknown;
}

/**
 * Reduce a provider's parameters to one of our keys.
 *
 * `error_code` is checked before `error` because it is the specific one:
 * Supabase reports a closed signup as `error=access_denied` with
 * `error_code=signup_disabled`, and reading only the first would tell somebody
 * they cancelled when in fact they were turned away.
 */
export function classifyProviderError(params: {
  error?: string | null;
  errorCode?: string | null;
}): AuthErrorKey {
  const code = params.errorCode?.trim().toLowerCase();
  const error = params.error?.trim().toLowerCase();

  switch (code) {
    case "signup_disabled":
      return "signup_disabled";
    case "otp_expired":
    case "email_link_invalid":
      return "link_expired";
    case "provider_disabled":
    case "provider_email_needs_verification":
      return "provider_unavailable";
    default:
      break;
  }

  switch (error) {
    case "access_denied":
      return "cancelled";
    case "server_error":
    case "temporarily_unavailable":
      return "provider_unavailable";
    default:
      return "unknown";
  }
}
