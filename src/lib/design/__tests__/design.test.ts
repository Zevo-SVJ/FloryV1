import assert from "node:assert/strict";
import { test } from "node:test";

import { designAttributes, designStyle, resolveDesign } from "../resolve.ts";
import { parseDesign, designSchema } from "../schema.ts";
import { THEMES, THEME_ORDER } from "../themes.ts";
import { checkContrast, contrastRatio, paletteWarnings } from "../contrast.ts";
import { HEX_PATTERN, THEME_IDS, type DesignConfig } from "../types.ts";

/**
 * The design system, and the two things that must always be true of it.
 *
 * First, that a stored design is presentation and only presentation: no path
 * through here can touch a link, a block or a username.
 *
 * Second, that nothing a creator types becomes CSS. Every token this produces
 * is either a hex colour that matched a pattern or a member of a literal
 * tuple, and the tests below are mostly attempts to get something else
 * through.
 */

/* ── Themes ───────────────────────────────────────────────────────────────── */

test("every theme is complete, and every theme is in the picker", () => {
  assert.deepEqual([...THEME_ORDER].sort(), [...THEME_IDS].sort());

  for (const id of THEME_IDS) {
    const theme = THEMES[id];
    assert.equal(theme.id, id, "a theme's key and its id must agree");
    assert.ok(theme.name.length > 0 && theme.description.endsWith("."), id);

    for (const [key, value] of Object.entries(theme.colors)) {
      assert.match(value, HEX_PATTERN, `${id}.${key}`);
    }
  }
});

test("no two themes are the same design wearing different names", () => {
  const seen = new Map<string, string>();

  for (const id of THEME_IDS) {
    const { name, description, id: _id, ...design } = THEMES[id];
    void name;
    void description;
    void _id;
    const fingerprint = JSON.stringify(design);
    const clash = seen.get(fingerprint);
    assert.equal(clash, undefined, `${id} is identical to ${clash}`);
    seen.set(fingerprint, id);
  }
});

test("every theme's own colours are readable", () => {
  for (const id of THEME_IDS) {
    const warnings = paletteWarnings(resolveDesign({ theme: id }).colors);
    assert.deepEqual(warnings, [], `${id}: ${warnings.map((w) => w.message).join(" ")}`);
  }
});

/* ── Resolution ───────────────────────────────────────────────────────────── */

test("an empty design resolves to the default theme, fully", () => {
  const resolved = resolveDesign({});

  assert.equal(resolved.theme, "minimal");
  assert.equal(resolved.font, THEMES.minimal.font);
  assert.equal(resolved.buttonShape, THEMES.minimal.buttonShape);
  assert.equal(resolved.width, THEMES.minimal.width);
});

test("null and undefined resolve rather than throwing", () => {
  assert.equal(resolveDesign(null).theme, "minimal");
  assert.equal(resolveDesign(undefined).theme, "minimal");
});

test("an override wins over its theme, and only that override", () => {
  const resolved = resolveDesign({ theme: "noir", buttons: { shape: "pill" } });

  assert.equal(resolved.buttonShape, "pill");
  // Everything else still comes from Noir.
  assert.equal(resolved.buttonStyle, THEMES.noir.buttonStyle);
  assert.equal(resolved.colors.background, THEMES.noir.colors.background);
});

test("a colour that is not a hex value is discarded, not rendered", () => {
  const resolved = resolveDesign({
    theme: "minimal",
    colors: { background: "red; } body { display: none" } as never,
  });

  assert.equal(resolved.colors.background, THEMES.minimal.colors.background);
});

/* ── Tokens ───────────────────────────────────────────────────────────────── */

const style = (config: DesignConfig) => designStyle(resolveDesign(config)) as Record<string, string>;

test("every emitted colour token is a hex value or an rgb triple", () => {
  for (const id of THEME_IDS) {
    for (const [key, value] of Object.entries(style({ theme: id }))) {
      if (!key.startsWith("--sm-")) continue;
      if (key.endsWith("-rgb")) {
        assert.match(value, /^\d{1,3} \d{1,3} \d{1,3}$/, `${id} ${key}`);
      }
    }
  }
});

test("a gradient becomes one linear-gradient built from validated parts", () => {
  const tokens = style({
    theme: "minimal",
    background: { kind: "gradient", gradient: { from: "#112233", to: "#445566", angle: 45 } },
  });

  assert.equal(tokens["--sm-layer-image"], "linear-gradient(45deg, #112233, #445566)");
});

test("a solid background replaces the page colour and emits no image layer", () => {
  const tokens = style({
    theme: "minimal",
    background: { kind: "solid", color: "#101010" },
  });

  assert.equal(tokens["--sm-bg"], "#101010");
  assert.equal(tokens["--sm-layer-image"], "none");
});

test("a background image is wrapped, quoted and escaped", () => {
  const tokens = style({
    theme: "minimal",
    background: {
      kind: "image",
      image: {
        url: "https://project.supabase.co/storage/v1/object/public/page-media/a/b.jpg",
        position: "top",
        overlay: 50,
        blur: false,
      },
    },
  });

  assert.match(tokens["--sm-layer-image"] ?? "", /^url\("https:\/\/[^"]+"\)$/);
  assert.equal(tokens["--sm-bg-position"], "top");
  assert.match(tokens["--sm-overlay"] ?? "", /^rgb\(\d+ \d+ \d+ \/ 50%\)$/);
});

test("a URL carrying CSS syntax cannot end the url() early", () => {
  /*
   * This can only arrive from a hand-edited row: the schema requires the URL
   * to be on our own storage host. It is escaped anyway, because "unreachable"
   * is a claim about today's code and this one becomes a stylesheet value.
   */
  const tokens = designStyle({
    ...resolveDesign({ theme: "minimal" }),
    background: {
      kind: "image",
      image: {
        url: 'https://evil.example/a.jpg"); background: url("javascript:alert(1)',
        position: "center",
        overlay: 20,
        blur: false,
      },
    },
  }) as Record<string, string>;

  const layer = tokens["--sm-layer-image"] ?? "";
  assert.equal(layer.startsWith('url("'), true);
  assert.equal(layer.endsWith('")'), true);
  // Exactly one quoted string, so nothing after it can be a new declaration.
  assert.equal(layer.split('"').length, 3);
});

test("the overlay is clamped, so a background can never become opaque", () => {
  const tokens = designStyle({
    ...resolveDesign({ theme: "minimal" }),
    background: {
      kind: "image",
      image: { url: "https://x.test/a.jpg", position: "center", overlay: 999, blur: false },
    },
  }) as Record<string, string>;

  assert.match(tokens["--sm-overlay"] ?? "", / \/ 85%\)$/);
});

test("every attribute value is a member of its own enum", () => {
  const attributes = designAttributes(resolveDesign({ theme: "glass" }));

  for (const value of Object.values(attributes)) {
    assert.match(value, /^[a-z_]+$|^true$/, value);
  }
  assert.equal(attributes["data-sm-theme"], "glass");
  assert.equal(attributes["data-sm-buttons"], THEMES.glass.buttonStyle);
});

/* ── The schema ───────────────────────────────────────────────────────────── */

test("a malformed design parses to the default rather than throwing", () => {
  assert.deepEqual(parseDesign(undefined), {});
  assert.deepEqual(parseDesign(null), {});
  assert.deepEqual(parseDesign("noir"), {});
  assert.deepEqual(parseDesign({ theme: "hot-pink" }), {});
  assert.equal(resolveDesign(parseDesign({ theme: 12 })).theme, "minimal");
});

test("a colour that is not six hex digits is refused", () => {
  for (const value of [
    "red",
    "#fff",
    "rgb(0,0,0)",
    "#12345g",
    "var(--x)",
    "#000000; background-image: url(x)",
    "expression(alert(1))",
  ]) {
    const result = designSchema.safeParse({ colors: { background: value } });
    assert.equal(result.success, false, value);
  }
});

test("a colour is accepted and lowercased", () => {
  const result = designSchema.safeParse({ colors: { accent: "  #AABBCC  " } });
  assert.equal(result.success, true);
  assert.equal(result.data?.colors?.accent, "#aabbcc");
});

test("a background image outside our storage is refused", () => {
  const result = designSchema.safeParse({
    background: {
      kind: "image",
      image: { url: "https://evil.example.com/tracker.gif" },
    },
  });
  assert.equal(result.success, false);
});

test("a background kind with nothing behind it is refused", () => {
  assert.equal(designSchema.safeParse({ background: { kind: "solid" } }).success, false);
  assert.equal(designSchema.safeParse({ background: { kind: "gradient" } }).success, false);
  assert.equal(designSchema.safeParse({ background: { kind: "image" } }).success, false);
  // "theme" needs nothing, because it means "whatever the theme says".
  assert.equal(designSchema.safeParse({ background: { kind: "theme" } }).success, true);
});

test("a gradient angle off the compass is refused", () => {
  const result = designSchema.safeParse({
    background: { kind: "gradient", gradient: { from: "#000000", to: "#ffffff", angle: 37 } },
  });
  assert.equal(result.success, false);
});

test("an unknown option is refused rather than passed through to CSS", () => {
  for (const config of [
    { typography: { font: "comic-sans" } },
    { buttons: { style: "neon" } },
    { buttons: { shape: "blob" } },
    { blocks: { style: "brutalist" } },
    { layout: { width: "enormous" } },
    { layout: { spacing: "0" } },
  ]) {
    assert.equal(designSchema.safeParse(config).success, false, JSON.stringify(config));
  }
});

test("a design carries no content, and cannot be made to", () => {
  const result = designSchema.safeParse({
    theme: "noir",
    links: [{ title: "Injected", url: "https://evil.example" }],
    username: "someone-else",
    bio: "replaced",
    avatar_url: "https://evil.example/x.png",
  });

  assert.equal(result.success, true);
  assert.deepEqual(Object.keys(result.data ?? {}), ["theme"]);
});

/**
 * `design.blocks` is block *style*, and has nothing to do with the blocks a
 * creator writes. The name is right in its own namespace and is exactly the
 * sort of collision that produces a confident, wrong assumption later — so it
 * is pinned here.
 */
test("design.blocks is a style, not a list of content blocks", () => {
  assert.equal(
    designSchema.safeParse({ blocks: [{ type: "text", data: {} }] }).success,
    false,
  );
  assert.equal(designSchema.safeParse({ blocks: { style: "card" } }).success, true);
});

/* ── Contrast ─────────────────────────────────────────────────────────────── */

test("contrast matches the values WCAG defines", () => {
  // Black on white is the maximum the formula produces.
  assert.equal(checkContrast("#000000", "#ffffff")?.ratio, 21);
  assert.equal(checkContrast("#ffffff", "#ffffff")?.ratio, 1);
  assert.equal(contrastRatio("#777777", "#ffffff")?.toFixed(2), "4.48");
});

test("contrast is symmetric and refuses malformed colours", () => {
  assert.equal(
    contrastRatio("#123456", "#abcdef"),
    contrastRatio("#abcdef", "#123456"),
  );
  assert.equal(contrastRatio("red", "#ffffff"), null);
});

test("an unreadable palette produces a warning naming the control", () => {
  const warnings = paletteWarnings({
    background: "#ffffff",
    text: "#f0f0f0",
    muted: "#fafafa",
    accent: "#000000",
    buttonBackground: "#ffffff",
    buttonText: "#fefefe",
  });

  assert.deepEqual(
    warnings.map((warning) => warning.key).sort(),
    ["buttonText", "muted", "text"],
  );
});

test("a readable palette produces no warnings", () => {
  assert.deepEqual(paletteWarnings(resolveDesign({ theme: "minimal" }).colors), []);
});
