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

export async function resolve(specifier, context, nextResolve) {
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
