/**
 * Environment, read once and reported honestly.
 *
 * ShowMe needs a Supabase project to do anything real. Rather than throwing at
 * import time — which turns a missing variable into an unreadable stack trace
 * on every route — this module reports whether the app is configured, and the
 * UI says so plainly. `requireSupabaseEnv()` is the throwing variant, used at
 * the point where a Supabase client is actually being constructed.
 *
 * `process.env.NEXT_PUBLIC_*` must be referenced literally, never through a
 * computed key: Next.js inlines these at build time by static analysis, and a
 * dynamic lookup silently yields `undefined` in the browser.
 */

export class MissingEnvError extends Error {
  /*
   * A plain field rather than a constructor parameter property. Node's
   * type-stripping runs the real source, and it cannot erase `readonly x` in a
   * parameter list — anything the test runner imports has to stay inside the
   * syntax it supports.
   */
  readonly variables: string[];

  constructor(variables: string[]) {
    super(
      `Missing environment variable${variables.length > 1 ? "s" : ""}: ${variables.join(", ")}. ` +
        "Copy .env.example to .env.local and fill it in.",
    );
    this.name = "MissingEnvError";
    this.variables = variables;
  }
}

const clean = (value: string | undefined): string | null => {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
};

const SUPABASE_URL = clean(process.env.NEXT_PUBLIC_SUPABASE_URL);
const SUPABASE_ANON_KEY = clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export interface SupabaseEnv {
  url: string;
  anonKey: string;
}

/** The Supabase config, or null when this deployment has none. */
export function supabaseEnv(): SupabaseEnv | null {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  return { url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY };
}

export const isSupabaseConfigured = (): boolean => supabaseEnv() !== null;

/** The same config, insisted upon. Throws a message a developer can act on. */
export function requireSupabaseEnv(): SupabaseEnv {
  const env = supabaseEnv();
  if (env) return env;

  const missing: string[] = [];
  if (!SUPABASE_URL) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!SUPABASE_ANON_KEY) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  throw new MissingEnvError(missing);
}

/**
 * The canonical origin.
 *
 * Used for absolute metadata URLs and auth redirects. Prefers the explicit
 * variable, falls back to the one Vercel injects, and finally to localhost so
 * that a fresh clone runs without any configuration at all.
 */
export function siteUrl(): string {
  const explicit = clean(process.env.NEXT_PUBLIC_SITE_URL);
  if (explicit) return explicit.replace(/\/+$/, "");

  const vercel = clean(process.env.NEXT_PUBLIC_VERCEL_URL) ?? clean(process.env.VERCEL_URL);
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, "").replace(/\/+$/, "")}`;

  return "http://localhost:3000";
}
