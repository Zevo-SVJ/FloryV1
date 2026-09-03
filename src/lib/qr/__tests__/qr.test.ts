import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MAX_VERSION,
  QUIET_ZONE,
  QrTooLongError,
  capacity,
  encodeQr,
  isDark,
  qrPath,
} from "@/lib/qr/encode";

/**
 * The QR encoder.
 *
 * A QR code is the one thing in this product with no forgiving failure mode.
 * A link that renders wrong is visible; a symbol that is subtly wrong is
 * printed on a business card, scans on the phone it was tested with, and fails
 * for a stranger in a café. So this file does not check that the encoder
 * produces "a QR code" — it checks that it produces *the* QR code.
 *
 * The golden digests below were generated from output verified module-for-
 * module against an independent reference encoder, over 546 payloads spanning
 * all ten versions, every capacity boundary, and the real page addresses. That
 * comparison found three bugs, every one of which produced a symbol that
 * scanned perfectly and disagreed with the standard:
 *
 *   · the format and version information was written before the mask was
 *     scored, so the field that records the mask influenced its own choice
 *     (ISO/IEC 18004 §7.8);
 *   · the always-dark module was set before scoring, a one-module difference
 *     that decides the winner whenever two masks are within a few points;
 *   · the 1:1:3:1:1 penalty scan slid by one module instead of advancing past
 *     a counted occurrence, over-counting rule three.
 *
 * The reference is not a dependency of this project and is not available here,
 * so the digests are how that verification is kept. A change that alters any
 * symbol fails loudly and has to be re-verified against a reference rather
 * than re-blessed.
 */

/** [payload, expected version, first 8 bytes of sha256 over the modules]. */
const GOLDEN: readonly [string, number, string][] = [
  ["https://showme.at/8zevo", 2, "af23ecd73d8e0673"],
  ["https://showme.at/alex", 2, "0f85167d45fcc780"],
  ["https://showme.at/a1z", 2, "67a99a31948d0729"],
  ["https://showme.at/zoe-b_1", 2, "3e11d017ce4f879a"],
  ["http://localhost:3000/8zevo", 3, "335320a0bc0ee925"],
  ["https://showme.at/nnnnnnnnnnnnnnnnnnnnnnnnnnnnnn", 4, "85131e0b26de58d1"],
  ["xxxxxxxxxxxxxx", 1, "c8649e406a34dffd"],
  ["yyyyyyyyyyyyy", 1, "7d0a76ed3c20aba3"],
  ["xxxxxxxxxxxxxxxxxxxxxxxxxx", 2, "08ea762643d0039f"],
  ["yyyyyyyyyyyyyyyyyyyyyyyyy", 2, "dfb92f4d1520040a"],
  ["xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", 3, "1a7796392989df37"],
  ["yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy", 3, "58ef7c28fc4d7104"],
  ["xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", 4, "6224a6f3a0bbc68b"],
  ["yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy", 4, "3a6ce9cbcad78ff8"],
  ["xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", 5, "e5920aa4f1c02a55"],
  ["yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy", 5, "f0e31ccd897ee6fa"],
  ["xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", 6, "7c10b09ae528505d"],
  ["yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy", 6, "39b4e2f61e8db989"],
  ["xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", 7, "39fabad74b9daeba"],
  ["yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy", 7, "8bf1ec72ca9db33b"],
  ["xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", 8, "9136eafad1d668c1"],
  ["yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy", 8, "0a1f9d8318be515b"],
  ["xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", 9, "81d47104c29942ba"],
  ["yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy", 9, "78009e2117024760"],
  ["xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", 10, "f673820bb5ccd3f0"],
  ["yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy", 10, "3ba0d9b2700795cc"],
];

const digest = (text: string): string => {
  const matrix = encodeQr(text);
  let bits = "";
  for (let row = 0; row < matrix.size; row += 1) {
    for (let col = 0; col < matrix.size; col += 1) {
      bits += isDark(matrix, row, col) ? "1" : "0";
    }
  }
  return createHash("sha256").update(bits).digest("hex").slice(0, 16);
};

describe("qr — verified symbols", () => {
  it("reproduces every verified symbol exactly", () => {
    for (const [text, version, expected] of GOLDEN) {
      const matrix = encodeQr(text);
      const label = text.length > 24 ? `${text.slice(0, 8)}…(${text.length})` : text;

      assert.equal(matrix.version, version, `version for ${label}`);
      assert.equal(matrix.size, 17 + 4 * version, `size for ${label}`);
      assert.equal(digest(text), expected, `modules for ${label}`);
    }
  });

  it("covers every version the encoder supports", () => {
    const versions = new Set(GOLDEN.map(([, version]) => version));
    for (let version = 1; version <= MAX_VERSION; version += 1) {
      assert.ok(versions.has(version), `no golden case at version ${version}`);
    }
  });
});

describe("qr — version selection", () => {
  it("uses the smallest version that fits, at every boundary", () => {
    for (let version = 1; version <= MAX_VERSION; version += 1) {
      const fits = capacity(version);
      assert.equal(encodeQr("x".repeat(fits)).version, version);

      // One byte more must move up — except at the ceiling, where it refuses.
      if (version < MAX_VERSION) {
        assert.equal(encodeQr("x".repeat(fits + 1)).version, version + 1);
      }
    }
  });

  it("capacity grows with version", () => {
    for (let version = 2; version <= MAX_VERSION; version += 1) {
      assert.ok(capacity(version) > capacity(version - 1));
    }
  });

  it("refuses a payload past the largest version", () => {
    const tooLong = "x".repeat(capacity(MAX_VERSION) + 1);
    assert.throws(() => encodeQr(tooLong), QrTooLongError);
  });

  /*
   * Byte mode counts bytes, not characters. A page address is ASCII, so this
   * never bites in production — but an encoder that measured `String.length`
   * would overflow its own capacity calculation on the first accented
   * character and produce a symbol that decodes to truncated text.
   */
  it("measures the payload in UTF-8 bytes", () => {
    const threeBytesEach = "日".repeat(5); // 15 bytes
    assert.equal(encodeQr(threeBytesEach).version, 2);
    assert.equal(encodeQr("x".repeat(15)).version, 2);
    assert.equal(encodeQr("x".repeat(14)).version, 1);
  });

  it("encodes the shortest possible page address at version 2", () => {
    // The narrowest real payload: the shortest allowed username. A creator
    // page never needs a version larger than 4, which is what keeps the
    // modules large enough to scan when printed small.
    assert.equal(encodeQr("https://showme.at/abc").version, 2);
    assert.ok(encodeQr("https://showme.at/" + "n".repeat(30)).version <= 4);
  });
});

describe("qr — structure", () => {
  const matrix = encodeQr("https://showme.at/8zevo");

  it("places a finder pattern in three corners and not the fourth", () => {
    const corners = [
      [0, 0],
      [0, matrix.size - 7],
      [matrix.size - 7, 0],
    ] as const;

    for (const [top, left] of corners) {
      for (let row = 0; row < 7; row += 1) {
        for (let col = 0; col < 7; col += 1) {
          const ring = Math.max(Math.abs(row - 3), Math.abs(col - 3));
          assert.equal(
            isDark(matrix, top + row, left + col),
            ring !== 2,
            `finder at ${top},${left} module ${row},${col}`,
          );
        }
      }
    }

    // The bottom-right corner carries data, not a fourth finder — which is
    // how a decoder knows the symbol's orientation.
    const far = matrix.size - 4;
    const allDark = [0, 1, 2].every((d) => isDark(matrix, far + d, far));
    assert.equal(allDark, false);
  });

  it("draws the separator around each finder", () => {
    for (let i = 0; i < 8; i += 1) {
      assert.equal(isDark(matrix, 7, i), false, `top-left separator at 7,${i}`);
      assert.equal(isDark(matrix, i, 7), false, `top-left separator at ${i},7`);
    }
  });

  it("alternates the timing patterns", () => {
    for (let i = 8; i < matrix.size - 8; i += 1) {
      assert.equal(isDark(matrix, 6, i), i % 2 === 0, `row timing at ${i}`);
      assert.equal(isDark(matrix, i, 6), i % 2 === 0, `column timing at ${i}`);
    }
  });

  it("always sets the dark module", () => {
    // Above the bottom-left finder. Part of the format information, and the
    // one module in the symbol whose value never depends on anything.
    for (let version = 1; version <= MAX_VERSION; version += 1) {
      const symbol = encodeQr("x".repeat(capacity(version)));
      assert.ok(isDark(symbol, symbol.size - 8, 8), `dark module at version ${version}`);
    }
  });

  it("places alignment patterns from version 2 up", () => {
    // Every version above 1 has one at the same offset from the bottom-right.
    for (let version = 2; version <= MAX_VERSION; version += 1) {
      const symbol = encodeQr("x".repeat(capacity(version)));
      const centre = symbol.size - 7;
      assert.ok(isDark(symbol, centre, centre), `centre at version ${version}`);
      assert.equal(isDark(symbol, centre - 1, centre), false, `ring at version ${version}`);
      assert.ok(isDark(symbol, centre - 2, centre), `edge at version ${version}`);
    }
  });

  it("has a quiet zone of four modules for every renderer to add", () => {
    assert.equal(QUIET_ZONE, 4);
  });
});

describe("qr — the SVG path", () => {
  it("covers exactly the dark modules and nothing else", () => {
    const matrix = encodeQr("https://showme.at/8zevo");
    const path = qrPath(matrix);

    /*
     * Replayed rather than eyeballed: every run in the path is expanded back
     * into modules, and the result has to be the matrix. A path that renders
     * plausibly while being one module out is invisible to a screenshot and
     * fatal to a scanner.
     */
    const painted = new Set<string>();
    for (const run of path.matchAll(/M(\d+) (\d+)h(\d+)v1h-\3z/g)) {
      const col = Number(run[1]);
      const row = Number(run[2]);
      const width = Number(run[3]);
      for (let i = 0; i < width; i += 1) painted.add(`${row},${col + i}`);
    }

    let dark = 0;
    for (let row = 0; row < matrix.size; row += 1) {
      for (let col = 0; col < matrix.size; col += 1) {
        const expected = isDark(matrix, row, col);
        if (expected) dark += 1;
        assert.equal(painted.has(`${row},${col}`), expected, `module ${row},${col}`);
      }
    }

    assert.equal(painted.size, dark);
    // Merging horizontal runs is the whole reason the path is small.
    assert.ok(path.length < dark * 12, "runs were not merged");
  });

  it("produces no path for an empty matrix region", () => {
    // The quiet zone is the caller's business, so the path never starts
    // before module zero — a negative coordinate would be clipped by the
    // viewBox and silently lose a row.
    const path = qrPath(encodeQr("https://showme.at/alex"));
    assert.equal(/M-/.test(path), false);
  });
});
