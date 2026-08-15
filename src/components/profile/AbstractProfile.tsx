import { cn } from "@/lib/utils";

/**
 * A profile, reduced to its shapes.
 *
 * The films are about attention, not about a particular person, and a real
 * sentence inside an animation pulls the eye out of the choreography to read
 * it. So the scenes use these: the geometry of a profile — a disc, a stack of
 * measures, a row of collections, a grid — with nothing to decipher.
 *
 * `weight` is the only variable. It is what separates a profile that has been
 * thought about from one that has not: the strong version has one clear focal
 * shape, an ordered rhythm of line lengths, and a consistent palette; the loose
 * version has neither.
 */

export type Weight = "strong" | "loose";

const INK = {
  strong: { key: "#2c3242", body: "#9aa2b5", faint: "#ccd2df" },
  loose: { key: "#6d7382", body: "#b3b8c4", faint: "#dcdee4" },
} as const;

export function AbstractAvatar({
  size = 62,
  weight = "strong",
  className,
}: {
  size?: number;
  weight?: Weight;
  className?: string;
}) {
  const tone = INK[weight];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={cn("shrink-0", className)}
      aria-hidden
    >
      <defs>
        <clipPath id={`disc-${weight}`}>
          <circle cx="32" cy="32" r="32" />
        </clipPath>
      </defs>
      <g clipPath={`url(#disc-${weight})`}>
        <rect width="64" height="64" fill={tone.faint} />
        {weight === "strong" ? (
          /* One subject, centred and large enough to survive being shrunk. */
          <>
            <circle cx="32" cy="27" r="13" fill={tone.key} opacity="0.55" />
            <path
              d="M8 64c2.4-14.6 11.6-21 24-21s21.6 6.4 24 21z"
              fill={tone.key}
              opacity="0.45"
            />
          </>
        ) : (
          /* Something distant and off-centre — the shape of a bad avatar. */
          <>
            <rect y="42" width="64" height="22" fill={tone.body} opacity="0.5" />
            <circle cx="47" cy="18" r="6" fill={tone.body} opacity="0.4" />
            <path d="M0 52l16-13 12 10 9-7 27 22z" fill={tone.key} opacity="0.28" />
          </>
        )}
      </g>
    </svg>
  );
}

/** The handle row: a name-length bar and the overflow dots. */
export function AbstractHandle({
  weight = "strong",
  className,
}: {
  weight?: Weight;
  className?: string;
}) {
  const tone = INK[weight];

  return (
    <div className={cn("flex items-center justify-between", className)} aria-hidden>
      <span
        className="block h-[7px] rounded-full"
        style={{
          width: weight === "strong" ? 76 : 128,
          backgroundColor: tone.key,
        }}
      />
      <span className="flex gap-[3px]">
        {[0, 1, 2].map((index) => (
          <span
            key={index}
            className="block h-[2.5px] w-[2.5px] rounded-full"
            style={{ backgroundColor: tone.faint }}
          />
        ))}
      </span>
    </div>
  );
}

/**
 * The bio, as measure.
 *
 * A strong bio is a short title and two lines that end deliberately. A loose one
 * runs to four lines of near-equal length, which is what "no editing" looks like
 * from across the room.
 */
export function AbstractBio({
  weight = "strong",
  className,
}: {
  weight?: Weight;
  className?: string;
}) {
  const tone = INK[weight];
  const rows =
    weight === "strong"
      ? [
          { width: "46%", height: 8, colour: tone.key },
          { width: "88%", height: 5, colour: tone.body },
          { width: "72%", height: 5, colour: tone.body },
          { width: "38%", height: 5, colour: "var(--color-accent)" },
        ]
      : [
          { width: "58%", height: 7, colour: tone.key },
          { width: "94%", height: 5, colour: tone.body },
          { width: "91%", height: 5, colour: tone.body },
          { width: "89%", height: 5, colour: tone.body },
        ];

  return (
    <div className={cn("space-y-[5px]", className)} aria-hidden>
      {rows.map((row, index) => (
        <span
          key={index}
          className="block rounded-full"
          style={{ width: row.width, height: row.height, backgroundColor: row.colour }}
        />
      ))}
    </div>
  );
}

/** Saved collections: discs with a title measure under each. */
export function AbstractCollections({
  weight = "strong",
  count = 4,
  className,
}: {
  weight?: Weight;
  count?: number;
  className?: string;
}) {
  const covers =
    weight === "strong"
      ? ["#E4E8F0", "#D8DEEA", "#C9D1E1", "#EDEFF5"]
      : ["#D6DBDD", "#EBE3D6", "#B2BCC1", "#DCD4C8"];

  return (
    <div className={cn("flex gap-[13px]", className)} aria-hidden>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="flex w-[45px] flex-col items-center gap-[6px]">
          <span className="rounded-full p-[1.5px] ring-1 ring-edge">
            <span
              className="block h-[37px] w-[37px] rounded-full"
              style={{ backgroundColor: covers[index % covers.length] }}
            />
          </span>
          <span
            className="block h-[4px] rounded-full"
            style={{
              width: weight === "strong" ? 24 : 34,
              backgroundColor: INK[weight].faint,
            }}
          />
        </div>
      ))}
    </div>
  );
}

/** The counts row, as three stacked measures. */
export function AbstractCounts({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-around", className)} aria-hidden>
      {[30, 44, 26].map((width, index) => (
        <span key={index} className="flex flex-col items-center gap-[5px]">
          <span
            className="block h-[7px] rounded-full bg-ink-2"
            style={{ width: width * 0.62 }}
          />
          <span
            className="block h-[4px] rounded-full bg-edge-strong"
            style={{ width }}
          />
        </span>
      ))}
    </div>
  );
}
