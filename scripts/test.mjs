import { register } from "node:module";
import { pathToFileURL } from "node:url";
import { run } from "node:test";
import { spec } from "node:test/reporters";
import path from "node:path";

/**
 * The test runner.
 *
 * Node's own, with the `@/*` alias registered first and TypeScript stripped by
 * the runtime. No jest, no vitest, no transform pipeline to keep in step with
 * the bundler.
 */

register(pathToFileURL(path.join(import.meta.dirname, "alias-hooks.mjs")));

let failed = false;

run({
  globPatterns: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  concurrency: true,
  execArgv: [
    "--experimental-strip-types",
    "--no-warnings",
    "--import",
    pathToFileURL(path.join(import.meta.dirname, "register-alias.mjs")).href,
  ],
})
  .on("test:fail", () => {
    failed = true;
  })
  .compose(spec)
  .pipe(process.stdout)
  .on("finish", () => {
    process.exitCode = failed ? 1 : 0;
  });
