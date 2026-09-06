/**
 * Environment, read once and reported honestly.
 *
 * LOCK needs a Supabase project to do anything real. Rather than throwing at
 * import time — which turns a missing variable into an unreadable stack trace
 * on every route — this module reports whether the app is configured, and the
 * UI says so plainly. `requireSupabaseEnv()` is the throwing variant, used at
 * the point where a client is actually being constructed.
 *
 * `process.env.NEXT_PUBLIC_*` must be referenced literally, never through a
 * computed key: Next.js inlines these at build time by static analysis, and a
 * dynamic lookup silently yields `undefined` in the browser.
 *
 * Every read happens inside a function rather than at module scope. On the
 * server these values are read at runtime — a `NEXT_PUBLIC_` variable that was
 * absent when `next build` ran is left as a live `process.env` lookup rather
 * than inlined — and capturing them once, when the module first loads, freezes
 * whatever the process happened to hold at that moment. A deployment platform
 * that withholds a variable from the build and supplies it at runtime (Vercel
 * does exactly this for variables marked sensitive) is then reported as
 * unconfigured forever. Reading per call costs a property lookup.
 */

export class MissingEnvError extends Error {
  /*
   * A plain field rather than a constructor parameter property. Node's
   * type-stripping runs the real source and cannot erase `readonly x` from a
   * parameter list, so anything the test runner imports stays inside the syntax
   * it supports.
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

/**
 * The API paths a Supabase project serves, when one of them is pasted by mistake.
 *
 * The dashboard shows the project URL next to the RESTful endpoint, and the two
 * are one line apart. Copying the wrong one costs an afternoon, because the
 * failure is silent and wrong in an unhelpful direction: the client appends its
 * own `/auth/v1` to whatever base it is given, so `…/rest/v1` turns a sign-in
 * into `…/rest/v1/auth/v1/authorize`. That is a valid REST path, REST requires
 * an API key on every request, and the browser — which is only ever *navigated*
 * to the authorize URL and cannot attach a header to a navigation — is answered
 * with "No API key found in request". Nothing in that message points at the
 * variable that caused it.
 *
 * None of these is ever a legitimate base URL, so trimming one is unambiguous.
 * A base that merely has a path — self-hosted behind a prefix — is left alone.
 */
const API_PATH = /\/(?:rest|auth|storage|realtime|functions)\/v1\/*$/;

const supabaseUrl = (): string | null => {
  const raw = clean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  if (!raw) return null;

  const base = raw.replace(API_PATH, "").replace(/\/+$/, "");
  if (!base) return null;

  /* Unparseable is missing. A client built on it would throw at the first
     request, far from the variable that is actually wrong. */
  try {
    new URL(base);
  } catch {
    return null;
  }
  return base;
};

const supabaseAnonKey = (): string | null => clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export interface SupabaseEnv {
  url: string;
  anonKey: string;
}

/** The Supabase config, or null when this deployment has none. */
export function supabaseEnv(): SupabaseEnv | null {
  const url = supabaseUrl();
  const anonKey = supabaseAnonKey();
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

export const isSupabaseConfigured = (): boolean => supabaseEnv() !== null;

/**
 * Which of the public variables this deployment is missing, by name.
 *
 * A variable set to an empty string counts as missing, and that is not a
 * hypothetical: it is how a real production deployment failed. All three keys
 * were present in `process.env` and every one of them held "". The dashboard
 * showed three configured variables; the process saw three blanks.
 *
 * Names only. A value never leaves this module.
 */
export function missingPublicEnv(): string[] {
  const missing: string[] = [];
  if (!supabaseUrl()) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!supabaseAnonKey()) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  return missing;
}

/**
 * Whether this is a deployment rather than somebody's laptop.
 *
 * It decides which advice is worth giving when the configuration is absent,
 * and nothing else. `VERCEL_ENV` is set on every Vercel deployment; the
 * `NODE_ENV` fallback covers anywhere else a production build is served.
 */
export function isDeployed(): boolean {
  return Boolean(clean(process.env.VERCEL_ENV)) || process.env.NODE_ENV === "production";
}

/** The same config, insisted upon. Throws a message a developer can act on. */
export function requireSupabaseEnv(): SupabaseEnv {
  const env = supabaseEnv();
  if (env) return env;

  const missing: string[] = [];
  if (!supabaseUrl()) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!supabaseAnonKey()) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  throw new MissingEnvError(missing);
}

/**
 * The canonical origin.
 *
 * Used for absolute metadata URLs and for the email confirmation link's
 * redirect target. Prefers the explicit variable, falls back to the one Vercel
 * injects, and finally to localhost so that a fresh clone runs with no
 * configuration at all.
 */
export function siteUrl(): string {
  const explicit = clean(process.env.NEXT_PUBLIC_SITE_URL);
  if (explicit) return explicit.replace(/\/+$/, "");

  const vercel = clean(process.env.NEXT_PUBLIC_VERCEL_URL) ?? clean(process.env.VERCEL_URL);
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, "").replace(/\/+$/, "")}`;

  return "http://localhost:3000";
}
