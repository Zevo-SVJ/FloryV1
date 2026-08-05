import { cn } from "@/lib/utils";

/**
 * A fabricated Instagram profile, built entirely from vectors and type.
 *
 * It is assembled from separable parts — photo, bio, highlights, grid —
 * because the hero cinematic pulls the screenshot apart and needs each
 * piece to be its own object. Nothing here is an image file, so it stays
 * crisp at any scale and costs nothing to load.
 */

export const PROFILE_WIDTH = 300;

export type ProfileVariant = "polished" | "raw";

/* ── Photo ─────────────────────────────────────────────────────────────── */

export function MockAvatar({
  size = 64,
  variant = "polished",
  className,
}: {
  size?: number;
  variant?: ProfileVariant;
  className?: string;
}) {
  return (
    <div
      className={cn("relative overflow-hidden rounded-full", className)}
      style={{ width: size, height: size }}
    >
      {variant === "polished" ? (
        <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden>
          <defs>
            <linearGradient id="avatar-bg" x1="0" y1="0" x2="0.4" y2="1">
              <stop offset="0%" stopColor="#E6DACC" />
              <stop offset="100%" stopColor="#CBB8A2" />
            </linearGradient>
          </defs>
          <rect width="64" height="64" fill="url(#avatar-bg)" />
          {/* shoulders */}
          <path d="M8 64c2-14 11-20 24-20s22 6 24 20z" fill="#8C7862" opacity="0.92" />
          {/* head */}
          <circle cx="32" cy="27" r="12.5" fill="#A08A72" />
          {/* hair mass, keeps it reading as a person at 24px */}
          <path
            d="M19.5 25c0-8 5.6-13 12.5-13s12.5 5 12.5 13c0-4-4-6.5-12.5-6.5S19.5 21 19.5 25z"
            fill="#6F5C49"
          />
          <ellipse cx="32" cy="47.5" rx="9.5" ry="4" fill="#EFE7DC" opacity="0.5" />
        </svg>
      ) : (
        <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden>
          <rect width="64" height="64" fill="#2B2724" />
          <text
            x="32"
            y="41"
            textAnchor="middle"
            fontSize="26"
            fontWeight="600"
            fill="#B9B0A6"
            fontFamily="var(--font-sans)"
          >
            H
          </text>
        </svg>
      )}
    </div>
  );
}

/* ── Header: photo + counts ────────────────────────────────────────────── */

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="tabular text-[13px] font-semibold leading-none text-ink">
        {value}
      </div>
      <div className="mt-1 text-[9.5px] leading-none text-ink-muted">{label}</div>
    </div>
  );
}

export function MockHeader({
  variant = "polished",
  className,
}: {
  variant?: ProfileVariant;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-5", className)}>
      <MockAvatar size={64} variant={variant} />
      <div className="flex flex-1 items-center justify-around">
        <Stat value="128" label="posts" />
        <Stat value={variant === "polished" ? "14.2k" : "9,481"} label="followers" />
        <Stat value="312" label="following" />
      </div>
    </div>
  );
}

/* ── Bio ───────────────────────────────────────────────────────────────── */

export function MockBio({
  variant = "polished",
  className,
}: {
  variant?: ProfileVariant;
  className?: string;
}) {
  if (variant === "raw") {
    return (
      <div className={cn("space-y-[3px]", className)}>
        <p className="text-[11px] font-semibold leading-tight text-ink">Halden</p>
        <p className="text-[10px] leading-[1.45] text-ink-muted">
          living my best life ✦ dream big ✦ hustle
        </p>
        <p className="text-[10px] leading-[1.45] text-ink-muted">
          DM for collabs !!! ↓↓↓ link below ↓↓↓
        </p>
        <p className="text-[10px] leading-[1.45] text-ink-faint">
          linktr.ee/haldenstudio
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-[3px]", className)}>
      <p className="text-[11px] font-semibold leading-tight text-ink">
        Halden Studio
      </p>
      <p className="text-[10px] leading-[1.45] text-ink-muted">
        Chairs, mostly. Made in Porto since 2016.
      </p>
      <p className="text-[10px] leading-[1.45] text-ink-muted">
        Commissions open — three slots left this year.
      </p>
      <p className="text-[10px] leading-[1.45] text-accent">halden.studio</p>
    </div>
  );
}

/* ── Highlights ────────────────────────────────────────────────────────── */

const HIGHLIGHTS_POLISHED = ["Work", "Studio", "Press", "Process"];
const HIGHLIGHTS_RAW = ["my faves ✨", "b-t-s !", "random", "2019 vibes"];

export function MockHighlights({
  variant = "polished",
  className,
}: {
  variant?: ProfileVariant;
  className?: string;
}) {
  const labels = variant === "polished" ? HIGHLIGHTS_POLISHED : HIGHLIGHTS_RAW;
  const covers =
    variant === "polished"
      ? ["#E4D8C9", "#D5C4AF", "#CBBBA6", "#E9E1D5"]
      : ["#CBD2D6", "#E3DACB", "#A8B3B8", "#D8CFC3"];

  return (
    <div className={cn("flex gap-[14px]", className)}>
      {labels.map((label, index) => (
        <div key={label} className="flex w-[46px] flex-col items-center gap-[5px]">
          <div className="rounded-full border border-line p-[2px]">
            <div
              className="h-[38px] w-[38px] rounded-full"
              style={{ backgroundColor: covers[index % covers.length] }}
            />
          </div>
          <span className="w-full truncate text-center text-[8.5px] leading-none text-ink-muted">
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ── Grid ──────────────────────────────────────────────────────────────── */

const WARM = ["#E8DED2", "#D9C9B6", "#C9B49C", "#EFE7DC", "#DED1C1", "#CFBDA8"];
const MISMATCHED = ["#D7DCDE", "#E9E4DA", "#AEB9BE", "#F0EDE6", "#C1CACE", "#CFC4B6"];

function Tile({
  index,
  variant,
  size,
}: {
  index: number;
  variant: ProfileVariant;
  size: number;
}) {
  const palette = variant === "polished" ? WARM : MISMATCHED;
  const base = palette[index % palette.length] ?? palette[0]!;
  const detail = variant === "polished" ? "#9C8770" : "#7F8A90";
  const composition = index % 6;

  return (
    <svg width={size} height={size} viewBox="0 0 88 88" aria-hidden>
      <rect width="88" height="88" fill={base} />

      {composition === 0 && (
        <>
          <rect y="52" width="88" height="36" fill={detail} opacity="0.28" />
          <circle cx="62" cy="28" r="9" fill={detail} opacity="0.35" />
        </>
      )}

      {composition === 1 && (
        <circle cx="40" cy="46" r="26" fill={detail} opacity="0.24" />
      )}

      {composition === 2 && (
        <path d="M0 88L88 0v88z" fill={detail} opacity="0.22" />
      )}

      {composition === 3 && (
        <>
          <circle cx="44" cy="34" r="13" fill={detail} opacity="0.42" />
          <path d="M18 88c3-16 12-23 26-23s23 7 26 23z" fill={detail} opacity="0.32" />
        </>
      )}

      {composition === 4 && (
        <>
          <rect x="12" y="18" width="12" height="70" fill={detail} opacity="0.2" />
          <rect x="38" y="30" width="12" height="58" fill={detail} opacity="0.28" />
          <rect x="64" y="10" width="12" height="78" fill={detail} opacity="0.16" />
        </>
      )}

      {composition === 5 && (
        <path
          d="M26 88V44a18 18 0 0136 0v44z"
          fill={detail}
          opacity="0.26"
        />
      )}
    </svg>
  );
}

export function MockGrid({
  variant = "polished",
  rows = 2,
  tile = 88,
  gap = 2,
  className,
}: {
  variant?: ProfileVariant;
  rows?: number;
  tile?: number;
  gap?: number;
  className?: string;
}) {
  const count = rows * 3;

  return (
    <div
      className={cn("grid grid-cols-3 overflow-hidden", className)}
      style={{ gap, width: tile * 3 + gap * 2 }}
    >
      {Array.from({ length: count }, (_, index) => (
        <Tile key={index} index={index} variant={variant} size={tile} />
      ))}
    </div>
  );
}

/* ── Chrome ────────────────────────────────────────────────────────────── */

export function MockTabs({ className }: { className?: string }) {
  return (
    <div className={cn("w-full", className)}>
      <div className="hairline" />
      <div className="flex items-center justify-around py-[9px]">
        <div className="grid grid-cols-3 gap-[2px]">
          {Array.from({ length: 9 }, (_, index) => (
            <span key={index} className="block h-[3px] w-[3px] bg-ink/70" />
          ))}
        </div>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
          <rect
            x="3"
            y="3"
            width="18"
            height="18"
            rx="4"
            stroke="#A49D93"
            strokeWidth="1.6"
          />
          <path d="M10 9l6 3-6 3z" fill="#A49D93" />
        </svg>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M12 4.5l2.4 5 5.6.8-4 4 .9 5.5-4.9-2.7-4.9 2.7.9-5.5-4-4 5.6-.8z"
            stroke="#A49D93"
            strokeWidth="1.6"
          />
        </svg>
      </div>
    </div>
  );
}

export function MockStatusBar({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center justify-between text-[9px] font-medium text-ink-muted",
        className,
      )}
    >
      <span className="tabular">9:41</span>
      <div className="flex items-center gap-[3px]">
        <span className="block h-[6px] w-[3px] rounded-[1px] bg-ink-faint" />
        <span className="block h-[8px] w-[3px] rounded-[1px] bg-ink-faint" />
        <span className="block h-[10px] w-[3px] rounded-[1px] bg-ink-faint" />
        <span className="ml-1 block h-[7px] w-[13px] rounded-[2px] border border-ink-faint" />
      </div>
    </div>
  );
}

export function MockUsernameBar({
  variant = "polished",
  className,
}: {
  variant?: ProfileVariant;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between", className)}>
      <span className="text-[11px] font-semibold tracking-tight text-ink">
        {variant === "polished" ? "halden.studio" : "halden_studio_official"}
      </span>
      <div className="flex gap-[10px]">
        <span className="block h-[2px] w-[2px] rounded-full bg-ink-faint" />
        <span className="block h-[2px] w-[2px] rounded-full bg-ink-faint" />
        <span className="block h-[2px] w-[2px] rounded-full bg-ink-faint" />
      </div>
    </div>
  );
}

/* ── Assembled screenshot ──────────────────────────────────────────────── */

export function ProfileCard({
  variant = "polished",
  rows = 2,
  className,
  showChrome = true,
}: {
  variant?: ProfileVariant;
  rows?: number;
  className?: string;
  showChrome?: boolean;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[22px] bg-surface shadow-panel",
        className,
      )}
      style={{ width: PROFILE_WIDTH }}
    >
      {showChrome ? (
        <div className="px-4 pt-3">
          <MockStatusBar />
          <MockUsernameBar variant={variant} className="mt-3" />
        </div>
      ) : null}

      <div className="px-4 pt-4">
        <MockHeader variant={variant} />
        <MockBio variant={variant} className="mt-3.5" />
        <MockHighlights variant={variant} className="mt-4" />
      </div>

      <MockTabs className="mt-3.5" />
      <MockGrid variant={variant} rows={rows} tile={88} gap={2} className="mx-auto" />
    </div>
  );
}
