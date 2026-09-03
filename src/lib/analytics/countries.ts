/**
 * Country codes, as a person would say them.
 *
 * `Intl.DisplayNames` rather than a table of two hundred names: the runtime
 * already ships every language's country names, and a hand-written list would
 * be a hundred lines of maintenance to say the same thing worse.
 *
 * `ZZ` is the code the breakdown uses for "we could not tell". It is a real
 * ISO 3166 user-assigned code and `Intl` renders it as "Unknown Region", which
 * is honest but reads like a system message, so it is named here instead.
 */

const NAMES =
  typeof Intl !== "undefined" && "DisplayNames" in Intl
    ? new Intl.DisplayNames(["en"], { type: "region" })
    : null;

export const UNKNOWN_COUNTRY = "ZZ";

export function countryName(code: string): string {
  if (code === UNKNOWN_COUNTRY) return "Unknown";

  try {
    return NAMES?.of(code) ?? code;
  } catch {
    // An invalid code reaching this far means a hand-edited row. Show what it
    // says rather than throwing inside a render.
    return code;
  }
}

/**
 * The flag for a country code.
 *
 * Regional indicator symbols: two letters offset into the Unicode block that
 * every platform renders as a flag. No image, no sprite sheet, no request.
 */
export function countryFlag(code: string): string {
  if (code === UNKNOWN_COUNTRY || !/^[A-Z]{2}$/.test(code)) return "🌍";

  const A = 0x1f1e6;
  return String.fromCodePoint(
    A + (code.charCodeAt(0) - 65),
    A + (code.charCodeAt(1) - 65),
  );
}
