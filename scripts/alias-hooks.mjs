import { pathToFileURL } from "node:url";
import { existsSync } from "node:fs";
import path from "node:path";

/**
 * Teach Node the `@/*` alias that tsconfig and the bundler already know.
 *
 * Next.js resolves `@/lib/...` through tsconfig `paths`; Node does not read
 * tsconfig. Rather than rewriting every import in the application to relative
 * paths so that a test runner can follow them, this maps the alias for Node —
 * fifteen lines instead of a dependency and a config file.
 *
 * Extensions are appended because ESM requires them and TypeScript source does
 * not carry them.
 */

const SRC = path.resolve(import.meta.dirname, "..", "src");
const EXTENSIONS = [".ts", ".tsx", ".js", ".mjs"];

/**
 * `server-only` is a guard, not a module.
 *
 * The package exists so that importing a server module from a Client Component
 * is a build error; the bundler resolves it to something that throws in a
 * browser build and to nothing at all on the server. Node has never heard of
 * it, so a test that reaches any server module fails at resolution rather than
 * at an assertion.
 *
 * Resolving it to an empty module here keeps the guard doing its real job in
 * the application and stops it from making server code untestable. The same
 * applies to `client-only`, its mirror image.
 */
const GUARDS = new Set(["server-only", "client-only"]);
const EMPTY = "data:text/javascript,";

export async function resolve(specifier, context, nextResolve) {
  if (GUARDS.has(specifier)) return { url: EMPTY, shortCircuit: true };
  if (!specifier.startsWith("@/")) return nextResolve(specifier, context);

  const base = path.join(SRC, specifier.slice(2));
  const candidates = [
    base,
    ...EXTENSIONS.map((extension) => base + extension),
    ...EXTENSIONS.map((extension) => path.join(base, `index${extension}`)),
  ];

  const resolved = candidates.find(
    (candidate) => existsSync(candidate) && !candidate.endsWith(path.sep),
  );
  if (!resolved) return nextResolve(specifier, context);

  return { url: pathToFileURL(resolved).href, shortCircuit: true };
}
