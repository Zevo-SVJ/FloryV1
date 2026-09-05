import { supabaseEnv } from "@/lib/env";

/**
 * A Content-Security-Policy with a per-request nonce.
 *
 * `next.config.ts` carried a note saying a CSP was deferred because a policy
 * shipping `unsafe-inline` for scripts "reads as protection while providing
 * none". That reasoning still holds, which is why this is nonce-based rather
 * than a list of hosts: Next.js emits inline bootstrap scripts on every page,
 * and the only way to allow those without allowing every injected script is to
 * mark them with a value the attacker cannot predict.
 *
 * How the nonce reaches Next's own scripts: the proxy sets this header on the
 * *request*, Next reads the `nonce-` value out of it while rendering, and
 * stamps it onto the scripts it generates. Setting it only on the response
 * would produce a policy that blocks the framework's own bootstrap — a blank
 * page in production and nothing in development, which is the failure mode
 * worth naming here.
 *
 * `'strict-dynamic'` is what makes this survive Next's code-splitting: the
 * bootstrap script carries the nonce, and scripts *it* loads inherit trust.
 * Without it every lazily-imported chunk would be refused.
 */

/** Web Crypto: the proxy runs on the Edge runtime, where `node:crypto` is absent. */
export function makeNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

export function contentSecurityPolicy(nonce: string): string {
  const dev = process.env.NODE_ENV !== "production";

  /*
   * The Supabase origin has to be reachable by the browser client: it refreshes
   * tokens and, in a Client Component, reads data. Taken from the environment
   * rather than hard-coded, so a different project or a local stack does not
   * need a code change to work.
   */
  const supabase = supabaseEnv()?.url;
  const connect = ["'self'", supabase, supabase?.replace(/^http/, "ws")].filter(Boolean);

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],

    /*
     * `unsafe-eval` in development only. Turbopack's hot-reload client compiles
     * modules at runtime and cannot work without it; production has no such
     * need, and this is exactly the kind of allowance that must not leak into
     * the deployed policy.
     */
    "script-src": ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'", ...(dev ? ["'unsafe-eval'"] : [])],

    /*
     * Styles are `unsafe-inline`, deliberately and with the trade-off stated:
     * React writes `style` attributes for things like a progress bar's width,
     * and a nonce cannot cover an attribute. The risk a style injection carries
     * is real but far smaller than script execution, and refusing inline styles
     * would break the interface rather than harden it.
     */
    "style-src": ["'self'", "'unsafe-inline'"],

    /*
     * Lesson content embeds screenshots and diagrams from wherever the author
     * hosts them, and `ImageBlock` renders those URLs directly in the browser
     * rather than proxying them. `https:` is the honest width of that.
     */
    "img-src": ["'self'", "https:", "data:", "blob:"],
    "font-src": ["'self'", "data:"],
    "connect-src": connect as string[],
    "media-src": ["'self'", "https:"],

    // Nothing in LOCK embeds a plugin, an applet, or another document.
    "object-src": ["'none'"],
    "frame-src": ["'none'"],
    "worker-src": ["'self'", "blob:"],

    // `frame-ancestors` is the modern half of the X-Frame-Options header that
    // `next.config.ts` also sets; both are kept because older browsers read one
    // and newer ones the other.
    "frame-ancestors": ["'none'"],

    // A stolen form should have nowhere to post to but us.
    "form-action": ["'self'"],
    "base-uri": ["'self'"],
  };

  return Object.entries(directives)
    .map(([name, values]) => `${name} ${values.join(" ")}`)
    .join("; ");
}

/** The header name, in one place so the proxy and the render cannot disagree. */
export const CSP_HEADER = "content-security-policy";
