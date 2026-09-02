import { register } from "node:module";
import { pathToFileURL } from "node:url";
import path from "node:path";

// Loaded into each test subprocess via --import, so the alias hook is in place
// before the test file's own imports are resolved.
register(pathToFileURL(path.join(import.meta.dirname, "alias-hooks.mjs")));
