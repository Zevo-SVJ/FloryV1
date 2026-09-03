import assert from "node:assert/strict";
import { test } from "node:test";

/**
 * The blocks whose validation depends on where our Storage lives.
 *
 * An image URL is only acceptable if it is on this deployment's own Supabase
 * host — which is what stops a creator page from pulling a tracking pixel, and
 * what makes these schemas untestable without that host being configured.
 * `src/lib/env.ts` reads `process.env` once at module load, so the variables
 * are set here *before* the modules are imported, and the import is dynamic
 * for exactly that reason: a static import is hoisted above these lines and
 * would read an unconfigured environment.
 *
 * This is the only test file in the project that needs the trick, and it is
 * here rather than in `registry.test.ts` so that the rest of the block
 * assertions keep running against a deployment with no Storage at all — which
 * is a real state, and one where every image is correctly refused.
 */

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key-for-tests";

const { BLOCKS } = await import("@/lib/blocks/registry");

const STORED = "https://project.supabase.co/storage/v1/object/public/page-media/u/a.png";
const item = { id: "g1", url: STORED, alt: "", caption: "" };

test("an image on our own Storage is accepted, and one anywhere else is not", () => {
  assert.equal(BLOCKS.image.schema.safeParse({ url: STORED }).success, true);
  assert.equal(
    BLOCKS.image.schema.safeParse({ url: "https://evil.example/pixel.png" }).success,
    false,
  );
});

test("a gallery image can carry a destination", () => {
  const parsed = BLOCKS.image_gallery.schema.safeParse({
    items: [{ ...item, href: "example.com/shop" }],
  });

  assert.equal(parsed.success, true);
  // Normalized on the way in, like every other URL a creator types.
  assert.equal(parsed.success && parsed.data.items[0]?.href, "https://example.com/shop");
});

test("a gallery image's destination cannot be a dangerous scheme", () => {
  for (const href of ["javascript:alert(1)", "data:text/html,x", "vbscript:msgbox(1)"]) {
    assert.equal(
      BLOCKS.image_gallery.schema.safeParse({ items: [{ ...item, href }] }).success,
      false,
      href,
    );
  }
});

test("a gallery image with no destination is not a link", () => {
  const parsed = BLOCKS.image_gallery.schema.safeParse({ items: [item] });
  // Null rather than undefined, so the renderer's check is one comparison.
  assert.equal(parsed.success && parsed.data.items[0]?.href, null);
});

test("a gallery is a swipe row or a grid, and the row is the default", () => {
  const parsed = BLOCKS.image_gallery.schema.safeParse({ items: [item] });
  assert.equal(parsed.success && parsed.data.layout, "carousel");

  assert.equal(
    BLOCKS.image_gallery.schema.safeParse({ items: [item], layout: "grid" }).success,
    true,
  );
  assert.equal(
    BLOCKS.image_gallery.schema.safeParse({ items: [item], layout: "masonry" }).success,
    false,
  );
});
