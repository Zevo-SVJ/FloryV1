import { cn, compactCount } from "@/lib/utils";

/**
 * The profile under analysis.
 *
 * Deliberately *not* a reproduction of any app's interface — no status bar, no
 * tab bar, no borrowed chrome. It is the universal grammar every social profile
 * shares: a face, a handle, counts, a few lines about you, a row of saved
 * collections, and a grid of work. Built from separable parts because the hero
 * scene pulls it apart layer by layer.
 */

export const SUBJECT_WIDTH = 296;

export type Quality = "strong" | "weak";

/* ── Avatar ─────────────────────────────────────────────────────────────── */

export function SubjectAvatar({
  size = 62,
  quality = "strong",
  className,
}: {
  size?: number;
  quality?: Quality;
  className?: string;
}) {
  return (
    <span
      className={cn("relative inline-block overflow-hidden rounded-full", className)}
      style={{ width: size, height: size }}
    >
      {quality === "strong" ? (
        <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden>
          <defs>
            <linearGradient id="subject-strong" x1="0" y1="0" x2="0.4" y2="1">
              <stop offset="0%" stopColor="#E8EBF2" />
              <stop offset="100%" stopColor="#C6CEE0" />
            </linearGradient>
          </defs>
          <rect width="64" height="64" fill="url(#subject-strong)" />
          <path d="M8 64c2.1-13.8 11-19.8 24-19.8S53.9 50.2 56 64z" fill="#7C859B" />
          <circle cx="32" cy="26" r="12.2" fill="#8F98AC" />
          <path
            d="M19.6 24.4c0-7.9 5.6-12.8 12.4-12.8s12.4 4.9 12.4 12.8c0-4-4-6.4-12.4-6.4s-12.4 2.4-12.4 6.4z"
            fill="#5E6779"
          />
        </svg>
      ) : (
        <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden>
          {/* A logo mark where a face should be — the thing the report flags. */}
          <rect width="64" height="64" fill="#22242B" />
          <path
            d="M20 42V22h5.5l6.5 11 6.5-11H44v20h-5V31l-5.6 9h-2.8L25 31v11z"
            fill="#9AA0AC"
          />
        </svg>
      )}
    </span>
  );
}

/* ── Identity: handle, name, counts ─────────────────────────────────────── */

function Count({ value, label }: { value: string; label: string }) {
  return (
    <span className="flex flex-col items-center">
      <span className="tabular text-[12.5px] font-semibold leading-none text-ink">
        {value}
      </span>
      <span className="mt-1 text-[9px] leading-none text-ink-3">{label}</span>
    </span>
  );
}

export function SubjectIdentity({
  quality = "strong",
  className,
}: {
  quality?: Quality;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-4", className)}>
      <SubjectAvatar size={62} quality={quality} />
      <div className="flex flex-1 items-center justify-around">
        <Count value="128" label="posts" />
        <Count
          value={compactCount(quality === "strong" ? 14200 : 9481)}
          label="followers"
        />
        <Count value="312" label="following" />
      </div>
    </div>
  );
}

export function SubjectHandle({
  quality = "strong",
  className,
}: {
  quality?: Quality;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between", className)}>
      <span className="text-[11.5px] font-semibold tracking-[-0.01em] text-ink">
        {quality === "strong" ? "halden.studio" : "halden_studio_official"}
      </span>
      <span className="flex gap-[3px]">
        <span className="block h-[2.5px] w-[2.5px] rounded-full bg-ink-4" />
        <span className="block h-[2.5px] w-[2.5px] rounded-full bg-ink-4" />
        <span className="block h-[2.5px] w-[2.5px] rounded-full bg-ink-4" />
      </span>
    </div>
  );
}

/* ── Bio ────────────────────────────────────────────────────────────────── */

export function SubjectBio({
  quality = "strong",
  className,
}: {
  quality?: Quality;
  className?: string;
}) {
  if (quality === "weak") {
    return (
      <div className={cn("space-y-[3px]", className)}>
        <p className="text-[11px] font-semibold leading-tight text-ink">Halden</p>
        <p className="text-[10px] leading-[1.45] text-ink-3">
          living my best life ✦ dream big ✦ hustle
        </p>
        <p className="text-[10px] leading-[1.45] text-ink-3">
          DM for collabs !!! ↓↓↓ link below ↓↓↓
        </p>
        <p className="text-[10px] leading-[1.45] text-ink-4">linktr.ee/haldenstudio</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-[3px]", className)}>
      <p className="text-[11px] font-semibold leading-tight text-ink">Halden Studio</p>
      <p className="text-[10px] leading-[1.45] text-ink-3">
        Hand-thrown tableware for restaurants.
      </p>
      <p className="text-[10px] leading-[1.45] text-ink-3">
        Porto since 2016 · three commissions open
      </p>
      <p className="text-[10px] leading-[1.45] text-accent">halden.studio/orders</p>
    </div>
  );
}

/* ── Collections ────────────────────────────────────────────────────────── */

const COLLECTIONS_STRONG = ["Work", "Studio", "Press", "Process"];
const COLLECTIONS_WEAK = ["my faves ✨", "b-t-s !", "random", "2019 vibes"];

export function SubjectCollections({
  quality = "strong",
  className,
}: {
  quality?: Quality;
  className?: string;
}) {
  const labels = quality === "strong" ? COLLECTIONS_STRONG : COLLECTIONS_WEAK;
  const covers =
    quality === "strong"
      ? ["#E4E8F0", "#D3DAE8", "#C6CFE0", "#EBEEF4"]
      : ["#CFD6DA", "#E7DFD4", "#AEB8BE", "#DAD2C7"];

  return (
    <div className={cn("flex gap-[13px]", className)}>
      {labels.map((label, index) => (
        <div key={label} className="flex w-[45px] flex-col items-center gap-[5px]">
          <span className="rounded-full p-[1.5px] ring-1 ring-edge">
            <span
              className="block h-[37px] w-[37px] rounded-full"
              style={{ backgroundColor: covers[index % covers.length] }}
            />
          </span>
          <span className="w-full truncate text-center text-[8px] leading-none text-ink-3">
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ── Work grid ──────────────────────────────────────────────────────────── */

const STRONG_TONES = ["#E9ECF2", "#DCE1EB", "#CBD3E1", "#F0F2F6", "#D6DCE8", "#C3CCDC"];
const WEAK_TONES = ["#D7DCDE", "#EBE6DC", "#AEB9BE", "#F1EEE8", "#C1CACE", "#D8CEC1"];

function Tile({
  index,
  quality,
  size,
}: {
  index: number;
  quality: Quality;
  size: number;
}) {
  const tones = quality === "strong" ? STRONG_TONES : WEAK_TONES;
  const base = tones[index % tones.length] ?? tones[0]!;
  const mark = quality === "strong" ? "#8A93A8" : "#7F8A90";
  const composition = index % 6;

  return (
    <svg width={size} height={size} viewBox="0 0 88 88" aria-hidden>
      <rect width="88" height="88" fill={base} />
      {composition === 0 && (
        <>
          <rect y="54" width="88" height="34" fill={mark} opacity="0.24" />
          <circle cx="62" cy="27" r="8.5" fill={mark} opacity="0.34" />
        </>
      )}
      {composition === 1 && <circle cx="41" cy="46" r="25" fill={mark} opacity="0.22" />}
      {composition === 2 && <path d="M0 88L88 0v88z" fill={mark} opacity="0.2" />}
      {composition === 3 && (
        <>
          <circle cx="44" cy="33" r="12.5" fill={mark} opacity="0.4" />
          <path d="M19 88c2.8-15.4 11.6-22 25-22s22.2 6.6 25 22z" fill={mark} opacity="0.3" />
        </>
      )}
      {composition === 4 && (
        <>
          <rect x="13" y="20" width="11" height="68" fill={mark} opacity="0.18" />
          <rect x="38" y="31" width="11" height="57" fill={mark} opacity="0.26" />
          <rect x="63" y="11" width="11" height="77" fill={mark} opacity="0.15" />
        </>
      )}
      {composition === 5 && (
        <path d="M27 88V45a17 17 0 0134 0v43z" fill={mark} opacity="0.24" />
      )}
    </svg>
  );
}

export function SubjectGrid({
  quality = "strong",
  rows = 2,
  tile = 88,
  gap = 2,
  className,
}: {
  quality?: Quality;
  rows?: number;
  tile?: number;
  gap?: number;
  className?: string;
}) {
  return (
    <div
      className={cn("grid grid-cols-3 overflow-hidden", className)}
      style={{ gap, width: tile * 3 + gap * 2 }}
    >
      {Array.from({ length: rows * 3 }, (_, index) => (
        <Tile key={index} index={index} quality={quality} size={tile} />
      ))}
    </div>
  );
}

/* ── Assembled ──────────────────────────────────────────────────────────── */

export function SubjectCard({
  quality = "strong",
  rows = 2,
  className,
}: {
  quality?: Quality;
  rows?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-panel bg-white shadow-card ring-1 ring-edge",
        className,
      )}
      style={{ width: SUBJECT_WIDTH }}
    >
      <div className="px-4 pt-4">
        <SubjectHandle quality={quality} />
        <SubjectIdentity quality={quality} className="mt-4" />
        <SubjectBio quality={quality} className="mt-3.5" />
        <SubjectCollections quality={quality} className="mt-4" />
      </div>
      <SubjectGrid
        quality={quality}
        rows={rows}
        tile={86}
        gap={2}
        className="mx-auto mt-4"
      />
    </div>
  );
}
