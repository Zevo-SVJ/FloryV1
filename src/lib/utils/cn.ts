/**
 * Join class names, dropping anything falsy.
 *
 * Deliberately not `clsx` + `tailwind-merge`. Those earn their place once
 * components take arbitrary overriding classes; at this size they would be two
 * dependencies doing what four lines do.
 */
export type ClassValue = string | false | null | undefined;

export const cn = (...values: ClassValue[]): string => values.filter(Boolean).join(" ");
