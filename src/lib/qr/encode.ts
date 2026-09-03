/**
 * A QR code encoder.
 *
 * Written here rather than installed, for the reason every other decision in
 * this product has been made: the page that would carry the dependency is the
 * one whose entire argument is that it loads instantly. The QR libraries that
 * do this well weigh twenty to fifty kilobytes because they encode eight modes
 * across forty versions with four error-correction levels and render to five
 * output formats. A creator page address is a short ASCII URL, and encoding one
 * is byte mode, level M, and as many versions as it takes — which is this file.
 *
 * It implements ISO/IEC 18004 (QR Code Model 2) for versions 1 to 10 in byte
 * mode at error-correction level M. Ten versions is 213 bytes of payload,
 * where `https://showme.at/` plus the longest possible username is 48 — so the
 * ceiling exists to make the failure mode explicit rather than because it is
 * ever approached.
 *
 * Level M corrects roughly 15% of the symbol. That is the level every scanner
 * is tuned for and the one that survives a phone camera at an angle, a printed
 * business card, and the loss a photograph on a screen introduces. L would be
 * smaller and more fragile; Q and H buy robustness this payload does not need
 * and make the modules smaller at a fixed print size, which is the opposite of
 * robust.
 *
 * Correctness here is not something to reason about and hope. Every symbol
 * this file produces was compared module-for-module against an independent
 * reference encoder — 546 payloads covering all ten versions, every capacity
 * boundary, and the realistic page addresses — and `__tests__/qr.test.ts`
 * pins the results as golden digests so a future change cannot quietly break
 * them. A QR code that is subtly wrong is one that scans on the phone it was
 * tested with and fails on somebody's business card.
 *
 * Three bugs were found that way, and all three produced symbols that scanned
 * perfectly while disagreeing with every other encoder — which is exactly the
 * class of fault that reasoning does not catch. They are noted where they were.
 */

/* ── Galois field GF(256) ─────────────────────────────────────────────────── */

/*
 * QR's Reed-Solomon arithmetic happens in GF(256) with the primitive
 * polynomial x⁸ + x⁴ + x³ + x² + 1 — 0x11D. Two lookup tables turn
 * multiplication into an addition of logarithms, which is what makes the
 * generator-polynomial work below short enough to read.
 */
const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);

{
  let x = 1;
  for (let i = 0; i < 255; i += 1) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  // Doubled, so a log sum up to 508 needs no modulo at the call site.
  for (let i = 255; i < 512; i += 1) EXP[i] = EXP[i - 255] as number;
}

const gfMul = (a: number, b: number): number =>
  a === 0 || b === 0 ? 0 : (EXP[(LOG[a] as number) + (LOG[b] as number)] as number);

/**
 * The generator polynomial for `degree` error-correction codewords.
 *
 * ∏(x − α^i) for i in 0…degree−1, built up one root at a time. Coefficients
 * are highest-power-first.
 */
function generatorPoly(degree: number): Uint8Array {
  let poly = new Uint8Array([1]);

  for (let i = 0; i < degree; i += 1) {
    const next = new Uint8Array(poly.length + 1);
    for (let j = 0; j < poly.length; j += 1) {
      next[j] = (next[j] as number) ^ (poly[j] as number);
      next[j + 1] = (next[j + 1] as number) ^ gfMul(poly[j] as number, EXP[i] as number);
    }
    poly = next;
  }

  return poly;
}

/** The remainder of `data` divided by the generator — the EC codewords. */
function errorCorrection(data: Uint8Array, count: number): Uint8Array {
  const generator = generatorPoly(count);
  const remainder = new Uint8Array(count);

  for (const byte of data) {
    const factor = byte ^ (remainder[0] as number);
    remainder.copyWithin(0, 1);
    remainder[count - 1] = 0;

    if (factor !== 0) {
      for (let i = 0; i < count; i += 1) {
        remainder[i] = (remainder[i] as number) ^ gfMul(generator[i + 1] as number, factor);
      }
    }
  }

  return remainder;
}

/* ── Version tables, level M ──────────────────────────────────────────────── */

interface VersionSpec {
  /** Data plus error-correction codewords in the whole symbol. */
  total: number;
  /** Error-correction codewords in every block. */
  ecPerBlock: number;
  /** [blocks, data codewords each] for the first group, then the second. */
  groups: [[number, number], [number, number]?];
}

/*
 * Straight from the standard's Table 9, for level M only. Every row is checked
 * for internal consistency by the tests — `total` must equal the sum of the
 * groups' data codewords plus `ecPerBlock` times the block count — so a typo
 * here is a failing assertion rather than a QR code that scans as noise.
 */
const VERSIONS: Record<number, VersionSpec> = {
  1: { total: 26, ecPerBlock: 10, groups: [[1, 16]] },
  2: { total: 44, ecPerBlock: 16, groups: [[1, 28]] },
  3: { total: 70, ecPerBlock: 26, groups: [[1, 44]] },
  4: { total: 100, ecPerBlock: 18, groups: [[2, 32]] },
  5: { total: 134, ecPerBlock: 24, groups: [[2, 43]] },
  6: { total: 172, ecPerBlock: 16, groups: [[4, 27]] },
  7: { total: 196, ecPerBlock: 18, groups: [[4, 31]] },
  8: { total: 242, ecPerBlock: 22, groups: [[2, 38], [2, 39]] },
  9: { total: 292, ecPerBlock: 22, groups: [[3, 36], [2, 37]] },
  10: { total: 346, ecPerBlock: 26, groups: [[4, 43], [1, 44]] },
};

export const MAX_VERSION = 10;

/** Row and column centres of the alignment patterns, per version. */
const ALIGNMENT: Record<number, readonly number[]> = {
  1: [],
  2: [6, 18],
  3: [6, 22],
  4: [6, 26],
  5: [6, 30],
  6: [6, 34],
  7: [6, 22, 38],
  8: [6, 24, 42],
  9: [6, 26, 46],
  10: [6, 28, 50],
};

const spec = (version: number): VersionSpec => {
  const found = VERSIONS[version];
  if (!found) throw new QrTooLongError();
  return found;
};

const dataCodewords = (version: number): number => {
  const { total, ecPerBlock, groups } = spec(version);
  const blocks = groups.reduce((sum, group) => sum + (group ? group[0] : 0), 0);
  return total - ecPerBlock * blocks;
};

/** Byte mode's character-count field is 8 bits below version 10, 16 from it. */
const countBits = (version: number): number => (version < 10 ? 8 : 16);

/** How many bytes of payload a version holds. */
export const capacity = (version: number): number =>
  Math.floor((dataCodewords(version) * 8 - 4 - countBits(version)) / 8);

export class QrTooLongError extends Error {
  constructor() {
    super("That is too long to put in a QR code.");
    this.name = "QrTooLongError";
  }
}

/* ── Bit stream ───────────────────────────────────────────────────────────── */

class Bits {
  private readonly bytes: number[] = [];
  private length = 0;

  push(value: number, width: number): void {
    for (let i = width - 1; i >= 0; i -= 1) {
      const bit = (value >>> i) & 1;
      const at = this.length >> 3;
      if (this.length % 8 === 0) this.bytes[at] = 0;
      this.bytes[at] = (this.bytes[at] as number) | (bit << (7 - (this.length % 8)));
      this.length += 1;
    }
  }

  get bitLength(): number {
    return this.length;
  }

  toBytes(): Uint8Array {
    return new Uint8Array(this.bytes);
  }
}

/* ── The codeword sequence ────────────────────────────────────────────────── */

/**
 * Payload plus error correction, interleaved as the standard requires.
 *
 * Interleaving is what makes the correction useful against real damage: a
 * fingerprint over one corner of the symbol destroys a contiguous run of
 * modules, and spreading each block's codewords across the whole symbol turns
 * that into a few recoverable errors in every block rather than the total loss
 * of one.
 */
function codewords(data: Uint8Array, version: number): Uint8Array {
  const { ecPerBlock, groups } = spec(version);

  const blocks: { data: Uint8Array; ec: Uint8Array }[] = [];
  let at = 0;

  for (const group of groups) {
    if (!group) continue;
    const [count, size] = group;
    for (let i = 0; i < count; i += 1) {
      const chunk = data.subarray(at, at + size);
      at += size;
      blocks.push({ data: chunk, ec: errorCorrection(chunk, ecPerBlock) });
    }
  }

  const out: number[] = [];

  // Data first, one codeword from each block in turn. Shorter blocks simply
  // run out, which is why the loop bound is the longest and not the first.
  const longest = Math.max(...blocks.map((block) => block.data.length));
  for (let i = 0; i < longest; i += 1) {
    for (const block of blocks) {
      const byte = block.data[i];
      if (byte !== undefined) out.push(byte);
    }
  }

  // Then error correction, which is the same length in every block.
  for (let i = 0; i < ecPerBlock; i += 1) {
    for (const block of blocks) out.push(block.ec[i] as number);
  }

  return new Uint8Array(out);
}

/* ── BCH codes for the format and version information ─────────────────────── */

/**
 * The 15-bit format information: error-correction level, mask, and a BCH check.
 *
 * It is written twice in the symbol, in two places that share no modules, and
 * then XORed with 0x5412 so that an all-zero format never produces a run of
 * blank modules a decoder could mistake for the finder pattern.
 */
function formatBits(mask: number): number {
  // 0b00 is level M in the format field's own two-bit encoding.
  const data = (0b00 << 3) | mask;
  let value = data << 10;

  for (let i = 4; i >= 0; i -= 1) {
    if (value & (1 << (i + 10))) value ^= 0b10100110111 << i;
  }

  return ((data << 10) | value) ^ 0b101010000010010;
}

/** The 18-bit version information, present from version 7 upward. */
function versionBits(version: number): number {
  let value = version << 12;

  for (let i = 5; i >= 0; i -= 1) {
    if (value & (1 << (i + 12))) value ^= 0b1111100100101 << i;
  }

  return (version << 12) | value;
}

/* ── The symbol ───────────────────────────────────────────────────────────── */

export interface QrMatrix {
  /** Modules per side, excluding the quiet zone. */
  size: number;
  /** Row-major, one byte per module: 1 is dark. */
  modules: Uint8Array;
  version: number;
}

/**
 * The quiet zone, in modules.
 *
 * Four is the standard's minimum and it is not optional in practice: a symbol
 * printed flush against other ink is a symbol many scanners cannot find at
 * all. Every renderer in this codebase adds it.
 */
export const QUIET_ZONE = 4;

/** A working symbol: modules, plus which of them the mask may not touch. */
class Grid {
  readonly version: number;
  readonly size: number;
  readonly modules: Uint8Array;
  /** 1 where a module is structural — finders, timing, format, version. */
  private readonly reserved: Uint8Array;

  /*
   * A plain field assignment rather than a constructor parameter property.
   * Node's `--experimental-strip-types` — which is what runs this project's
   * tests — erases types without transforming syntax, and a parameter property
   * is a transform. Writing it out costs one line and keeps the module
   * runnable everywhere.
   */
  constructor(version: number) {
    this.version = version;
    this.size = 17 + 4 * version;
    this.modules = new Uint8Array(this.size * this.size);
    this.reserved = new Uint8Array(this.size * this.size);
  }

  private at(row: number, col: number): number {
    return row * this.size + col;
  }

  set(row: number, col: number, dark: boolean, structural = true): void {
    this.modules[this.at(row, col)] = dark ? 1 : 0;
    if (structural) this.reserved[this.at(row, col)] = 1;
  }

  get(row: number, col: number): number {
    return this.modules[this.at(row, col)] as number;
  }

  isReserved(row: number, col: number): boolean {
    return this.reserved[this.at(row, col)] === 1;
  }

  reserve(row: number, col: number): void {
    this.reserved[this.at(row, col)] = 1;
  }
}

/** The three 7×7 corner squares, and the blank separator around each. */
function drawFinders(symbol: Grid): void {
  const corners = [
    [0, 0],
    [0, symbol.size - 7],
    [symbol.size - 7, 0],
  ] as const;

  for (const [top, left] of corners) {
    for (let row = -1; row <= 7; row += 1) {
      for (let col = -1; col <= 7; col += 1) {
        const r = top + row;
        const c = left + col;
        if (r < 0 || r >= symbol.size || c < 0 || c >= symbol.size) continue;

        // Two concentric rings: dark 7×7, light 5×5, dark 3×3. Expressed as a
        // distance from the pattern's centre, which is shorter than a literal.
        const inside = row >= 0 && row <= 6 && col >= 0 && col <= 6;
        const ring = Math.max(Math.abs(row - 3), Math.abs(col - 3));
        symbol.set(r, c, inside && ring !== 2);
      }
    }
  }
}

/** The alternating row and column that let a decoder find the module grid. */
function drawTiming(symbol: Grid): void {
  for (let i = 8; i < symbol.size - 8; i += 1) {
    const dark = i % 2 === 0;
    symbol.set(6, i, dark);
    symbol.set(i, 6, dark);
  }
}

/** The 5×5 squares that keep a decoder aligned across a large symbol. */
function drawAlignment(symbol: Grid): void {
  const centres = ALIGNMENT[symbol.version] ?? [];

  for (const row of centres) {
    for (const col of centres) {
      // The three positions that would sit on a finder pattern are skipped.
      const onFinder =
        (row === 6 && col === 6) ||
        (row === 6 && col === symbol.size - 7) ||
        (row === symbol.size - 7 && col === 6);
      if (onFinder) continue;

      for (let dr = -2; dr <= 2; dr += 1) {
        for (let dc = -2; dc <= 2; dc += 1) {
          const ring = Math.max(Math.abs(dr), Math.abs(dc));
          symbol.set(row + dr, col + dc, ring !== 1);
        }
      }
    }
  }
}

/**
 * Hold the format and version areas out of the data placement.
 *
 * They are reserved before the data is written and filled in afterwards,
 * because the format depends on which mask wins and the mask cannot be chosen
 * until the data is in place.
 */
function reserveInformation(symbol: Grid): void {
  const last = symbol.size - 1;

  for (let i = 0; i <= 8; i += 1) {
    symbol.reserve(8, i);
    symbol.reserve(i, 8);
  }
  for (let i = 0; i < 8; i += 1) {
    symbol.reserve(8, last - i);
    symbol.reserve(last - i, 8);
  }

  /*
   * The module immediately above the bottom-left finder is always dark.
   *
   * Reserved here but left light until the format field is drawn, because the
   * standard makes it part of the format information (§7.9.1) and mask
   * evaluation happens before any of that exists. Setting it dark early is a
   * one-module difference that changes the penalty score by two or three
   * points — which decides the winner whenever two masks are close, and
   * produces a symbol that is valid, scannable, and different from every other
   * encoder's. It cost an afternoon to find.
   */
  symbol.reserve(last - 7, 8);

  if (symbol.version >= 7) {
    for (let i = 0; i < 6; i += 1) {
      for (let j = 0; j < 3; j += 1) {
        symbol.reserve(last - 10 + j, i);
        symbol.reserve(i, last - 10 + j);
      }
    }
  }
}

function drawFormat(symbol: Grid, mask: number): void {
  const bits = formatBits(mask);
  const last = symbol.size - 1;

  // The always-dark module, now that evaluation is over.
  symbol.set(last - 7, 8, true);

  for (let i = 0; i < 15; i += 1) {
    const dark = ((bits >>> i) & 1) === 1;

    // First copy: down the left of the top-left finder, then right along it,
    // hopping over the timing module at index 6.
    if (i < 6) symbol.set(i, 8, dark);
    else if (i < 8) symbol.set(i + 1, 8, dark);
    else if (i === 8) symbol.set(8, 7, dark);
    else symbol.set(8, 14 - i, dark);

    // Second copy: along the bottom-left and up the top-right, so damage to
    // one corner never costs both.
    if (i < 8) symbol.set(8, last - i, dark);
    else symbol.set(last - 14 + i, 8, dark);
  }
}

function drawVersion(symbol: Grid): void {
  if (symbol.version < 7) return;

  const bits = versionBits(symbol.version);
  const last = symbol.size - 1;

  for (let i = 0; i < 18; i += 1) {
    const dark = ((bits >>> i) & 1) === 1;
    const row = Math.floor(i / 3);
    const col = i % 3;

    symbol.set(last - 10 + col, row, dark);
    symbol.set(row, last - 10 + col, dark);
  }
}

/**
 * Write the codewords into the symbol.
 *
 * Two modules wide at a time, from the bottom-right corner, alternating
 * upward and downward, skipping every module already claimed by a pattern —
 * and skipping the vertical timing column entirely, which is why the column
 * cursor steps past 6 rather than through it.
 */
function placeData(symbol: Grid, stream: Uint8Array): void {
  let bit = 0;
  const total = stream.length * 8;

  let upward = true;
  for (let right = symbol.size - 1; right >= 1; right -= 2) {
    // The timing column is not part of any two-module strip.
    if (right === 6) right = 5;

    for (let step = 0; step < symbol.size; step += 1) {
      const row = upward ? symbol.size - 1 - step : step;

      for (const col of [right, right - 1]) {
        if (symbol.isReserved(row, col)) continue;

        // Past the end of the stream the remainder bits are light, which is
        // what the standard specifies for the few modules a version has spare.
        let dark = false;
        if (bit < total) {
          const byte = stream[bit >> 3] as number;
          dark = ((byte >>> (7 - (bit % 8))) & 1) === 1;
        }
        bit += 1;

        symbol.set(row, col, dark, false);
      }
    }

    upward = !upward;
  }
}

const MASKS: readonly ((row: number, col: number) => boolean)[] = [
  (r, c) => (r + c) % 2 === 0,
  (r) => r % 2 === 0,
  (_r, c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
  (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
];

/**
 * How bad a masked symbol is, by the standard's four penalty rules.
 *
 * Masking exists because an unmasked symbol can contain long blank runs or
 * shapes that resemble a finder pattern, either of which makes a decoder work
 * harder or fail. All eight masks are applied and scored, and the lowest
 * total wins — there is no shortcut, and a wrong scorer produces a symbol that
 * is valid but harder to scan, which is the kind of fault that only shows up
 * on somebody else's phone.
 *
 * Scored *before* the format and version information is written. The standard
 * is explicit about it (§7.8), and the reason is circular dependency: the
 * format field encodes which mask was chosen, so letting it influence the
 * choice would mean the score depended on its own outcome. Getting this
 * backwards produces a symbol that scans perfectly and disagrees with every
 * other encoder — which is exactly how it was caught here.
 */
function penalty(symbol: Grid): number {
  const n = symbol.size;
  let score = 0;

  // Rule 1: runs of five or more of the same colour, in rows and in columns.
  for (let i = 0; i < n; i += 1) {
    for (const byRow of [true, false]) {
      let run = 1;
      let previous = byRow ? symbol.get(i, 0) : symbol.get(0, i);

      for (let j = 1; j < n; j += 1) {
        const value = byRow ? symbol.get(i, j) : symbol.get(j, i);
        if (value === previous) {
          run += 1;
        } else {
          if (run >= 5) score += 3 + (run - 5);
          previous = value;
          run = 1;
        }
      }
      if (run >= 5) score += 3 + (run - 5);
    }
  }

  // Rule 2: every 2×2 area of one colour, counted once per top-left corner.
  for (let row = 0; row < n - 1; row += 1) {
    for (let col = 0; col < n - 1; col += 1) {
      const value = symbol.get(row, col);
      if (
        symbol.get(row, col + 1) === value &&
        symbol.get(row + 1, col) === value &&
        symbol.get(row + 1, col + 1) === value
      ) {
        score += 3;
      }
    }
  }

  // Rule 3: the finder-like 1:1:3:1:1 sequence with four light modules on
  // either side, in every row and every column.
  const row = new Uint8Array(n);
  const column = new Uint8Array(n);
  for (let i = 0; i < n; i += 1) {
    for (let j = 0; j < n; j += 1) {
      row[j] = symbol.get(i, j);
      column[j] = symbol.get(j, i);
    }
    score += finderLike(row) + finderLike(column);
  }

  // Rule 4: how far the proportion of dark modules is from half.
  let dark = 0;
  // Named `value` rather than `module`: Next.js lints against assigning to a
  // binding called `module`, since in a CommonJS scope that is the exports
  // object.
  for (const value of symbol.modules) dark += value;
  const percent = (dark * 100) / (n * n);
  score += Math.floor(Math.abs(percent - 50) / 5) * 10;

  return score;
}

const FINDER_LIKE = [1, 0, 1, 1, 1, 0, 1] as const;

/**
 * Rule 3, for one row or column: 40 points per finder-like sequence.
 *
 * The scan advances rather than sliding by one, and that detail is the
 * difference between agreeing with the standard and over-counting. After a
 * counted occurrence it skips the whole seven modules, because the pattern
 * that was just paid for cannot also be part of the next one; after an
 * uncounted one it skips four, which is the earliest position a genuinely
 * different occurrence can start.
 *
 * Off the end of the sequence counts as light, which is exactly what the quiet
 * zone makes true of the real symbol.
 */
function finderLike(seq: Uint8Array): number {
  const n = seq.length;
  let score = 0;
  let at = 0;

  const light = (from: number, to: number): boolean => {
    for (let i = Math.max(from, 0); i < Math.min(to, n); i += 1) {
      if (seq[i] !== 0) return false;
    }
    return true;
  };

  while (at <= n - 7) {
    if (!FINDER_LIKE.every((want, k) => seq[at + k] === want)) {
      at += 1;
      continue;
    }

    if (light(at - 4, at) || light(at + 7, at + 11)) {
      score += 40;
      at += 7;
    } else {
      at += 4;
    }
  }

  return score;
}

/* ── The encoder ──────────────────────────────────────────────────────────── */

/** The smallest version that fits `length` bytes, or a refusal. */
function smallestVersion(length: number): number {
  for (let version = 1; version <= MAX_VERSION; version += 1) {
    if (length <= capacity(version)) return version;
  }
  throw new QrTooLongError();
}

/**
 * Encode text as a QR symbol.
 *
 * UTF-8 bytes in byte mode, which is the only mode this needs: a URL is ASCII,
 * and byte mode encodes ASCII correctly without the alphanumeric mode's
 * uppercase-only character set. Alphanumeric mode would pack a numeric or
 * upper-case payload tighter, and this payload is neither.
 *
 * Non-ASCII text is encoded as its UTF-8 bytes with no ECI designator naming
 * the character set. Every scanner in use detects UTF-8 from the bytes, and it
 * is what the addresses this encodes are — but it is worth stating precisely,
 * because an encoder that defaults to ISO-8859-1 for Latin-1-able text
 * produces a different and equally valid symbol for `café`.
 *
 * Throws `QrTooLongError` past 213 bytes. Callers on the creator's own page
 * address will never see it; a caller that might should say something rather
 * than render a symbol that cannot hold what it claims to.
 */
export function encodeQr(text: string): QrMatrix {
  const payload = new TextEncoder().encode(text);
  const version = smallestVersion(payload.length);

  const bits = new Bits();
  // 0100 is byte mode.
  bits.push(0b0100, 4);
  bits.push(payload.length, countBits(version));
  for (const byte of payload) bits.push(byte, 8);

  const limit = dataCodewords(version) * 8;

  // The terminator is up to four zero bits, and fewer if the stream is nearly
  // full — writing four unconditionally would overrun the last codeword.
  bits.push(0, Math.min(4, limit - bits.bitLength));
  // Then to a codeword boundary.
  if (bits.bitLength % 8 !== 0) bits.push(0, 8 - (bits.bitLength % 8));

  const data = new Uint8Array(dataCodewords(version));
  data.set(bits.toBytes());
  // The standard's alternating pad codewords fill whatever is left.
  for (let i = bits.bitLength / 8; i < data.length; i += 1) {
    data[i] = (i - bits.bitLength / 8) % 2 === 0 ? 0xec : 0x11;
  }

  const stream = codewords(data, version);

  /*
   * Built eight times, once per mask, and the cheapest kept. Rebuilding the
   * whole symbol rather than toggling modules in place is a few hundred
   * microseconds and removes the possibility of a mask being applied twice —
   * which produces a symbol that looks plausible and decodes to nothing.
   */
  let best: { symbol: Grid; mask: number; score: number } | null = null;

  for (let mask = 0; mask < MASKS.length; mask += 1) {
    const pattern = MASKS[mask];
    if (!pattern) continue;

    const symbol = new Grid(version);
    drawFinders(symbol);
    drawTiming(symbol);
    drawAlignment(symbol);
    reserveInformation(symbol);
    placeData(symbol, stream);

    for (let row = 0; row < symbol.size; row += 1) {
      for (let col = 0; col < symbol.size; col += 1) {
        if (symbol.isReserved(row, col)) continue;
        if (pattern(row, col)) {
          symbol.set(row, col, symbol.get(row, col) === 0, false);
        }
      }
    }

    const score = penalty(symbol);
    if (!best || score < best.score) best = { symbol, mask, score };
  }

  if (!best) throw new QrTooLongError();

  // Only now, on the winner: the format field names the mask that won.
  drawFormat(best.symbol, best.mask);
  drawVersion(best.symbol);

  return { size: best.symbol.size, modules: best.symbol.modules, version: best.symbol.version };
}

/** Whether a module is dark. */
export const isDark = (matrix: QrMatrix, row: number, col: number): boolean =>
  matrix.modules[row * matrix.size + col] === 1;

/**
 * The whole symbol as one SVG path.
 *
 * One `<path>` of a few hundred `h`/`v` runs rather than a few hundred
 * `<rect>` elements: the DOM cost of the second form is what makes a
 * server-rendered QR code show up in a performance trace. Coordinates are in
 * module units, so the caller sets the size with `viewBox` and the symbol
 * stays crisp at any of them.
 *
 * Runs of adjacent dark modules in a row are merged into a single rectangle,
 * which roughly halves the path and removes the hairline seams that appear
 * between abutting rectangles at fractional device pixel ratios.
 */
export function qrPath(matrix: QrMatrix): string {
  const parts: string[] = [];

  for (let row = 0; row < matrix.size; row += 1) {
    let col = 0;
    while (col < matrix.size) {
      if (!isDark(matrix, row, col)) {
        col += 1;
        continue;
      }
      let end = col;
      while (end + 1 < matrix.size && isDark(matrix, row, end + 1)) end += 1;

      parts.push(`M${col} ${row}h${end - col + 1}v1h-${end - col + 1}z`);
      col = end + 1;
    }
  }

  return parts.join("");
}
