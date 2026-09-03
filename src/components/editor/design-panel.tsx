"use client";

import { useId, useState } from "react";
import { ChoiceField, Icon, ICONS, ImagePicker } from "@/components/editor/controls";
import { ThemeSwatch } from "@/components/editor/theme-swatch";
import { paletteWarnings } from "@/lib/design/contrast";
import { FONTS, FONT_ORDER } from "@/lib/design/fonts";
import { resolveDesign } from "@/lib/design/resolve";
import { THEMES, THEME_ORDER } from "@/lib/design/themes";
import {
  GRADIENT_ANGLES,
  HEX_PATTERN,
  PALETTE_KEYS,
  type BackgroundConfig,
  type DesignConfig,
  type GradientAngle,
  type Palette,
  type ThemeId,
} from "@/lib/design/types";
import { cn } from "@/lib/utils/cn";

/**
 * Where a creator decides how their page looks.
 *
 * Organised as six collapsed sections rather than one screen of forty
 * controls, and only one opens at a time. That is not tidiness: a design panel
 * that shows everything at once invites changing everything at once, and the
 * result is a page nobody chose.
 *
 * Every control writes into the sparse `DesignConfig` — the *difference* from
 * the theme — so "not set" stays distinguishable from "set to the value the
 * theme happens to use". A creator who never opens Colours keeps receiving
 * their theme's palette as that theme is refined.
 *
 * Nothing here is debounced or saved on change. It edits the same draft the
 * content editor does, and the same Save button persists both — so a creator
 * who changed a theme and retitled a link presses Save once.
 */

export function DesignPanel({
  design,
  onChange,
}: {
  design: DesignConfig;
  onChange: (design: DesignConfig) => void;
}) {
  const [open, setOpen] = useState<string | null>("theme");
  const resolved = resolveDesign(design);
  const theme = THEMES[resolved.theme];

  const toggle = (id: string) => setOpen((current) => (current === id ? null : id));

  /** Every setter is a shallow merge, so one section never clears another. */
  const patch = (next: Partial<DesignConfig>) => onChange({ ...design, ...next });

  const warnings = paletteWarnings(resolved.colors);

  return (
    <div className="space-y-2">
      <Section
        id="theme"
        title="Theme"
        summary={theme.name}
        open={open === "theme"}
        onToggle={toggle}
      >
        <ThemePicker design={design} onChange={onChange} />
      </Section>

      <Section
        id="colors"
        title="Colours"
        summary={design.colors ? "Customised" : "From theme"}
        open={open === "colors"}
        onToggle={toggle}
        warning={warnings.length > 0}
      >
        <ColorSection design={design} resolvedColors={resolved.colors} onChange={patch} />
      </Section>

      <Section
        id="background"
        title="Background"
        summary={BACKGROUND_LABELS[resolved.background.kind]}
        open={open === "background"}
        onToggle={toggle}
      >
        <BackgroundSection
          background={resolved.background}
          onChange={(background) => patch({ background })}
          onClear={() => patch({ background: undefined })}
          customised={design.background !== undefined}
        />
      </Section>

      <Section
        id="type"
        title="Typography"
        summary={`${FONTS[resolved.font].name} · ${capitalize(resolved.scale)}`}
        open={open === "type"}
        onToggle={toggle}
      >
        <TypographySection design={design} onChange={patch} />
      </Section>

      <Section
        id="buttons"
        title="Buttons & blocks"
        summary={`${capitalize(resolved.buttonStyle)} · ${capitalize(resolved.buttonShape)}`}
        open={open === "buttons"}
        onToggle={toggle}
      >
        <ButtonSection design={design} onChange={patch} />
      </Section>

      <Section
        id="layout"
        title="Layout"
        summary={`${capitalize(resolved.width)} · ${capitalize(resolved.spacing)}`}
        open={open === "layout"}
        onToggle={toggle}
      >
        <LayoutSection design={design} onChange={patch} />
      </Section>

      <ResetDesign design={design} onChange={onChange} />
    </div>
  );
}

const BACKGROUND_LABELS = {
  theme: "From theme",
  solid: "Solid colour",
  gradient: "Gradient",
  image: "Image",
} as const;

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

/* ── The accordion ────────────────────────────────────────────────────────── */

function Section({
  id,
  title,
  summary,
  open,
  onToggle,
  warning,
  children,
}: {
  id: string;
  title: string;
  summary: string;
  open: boolean;
  onToggle: (id: string) => void;
  warning?: boolean;
  children: React.ReactNode;
}) {
  const panelId = `design-${id}`;

  return (
    <section className="overflow-hidden rounded-card border border-border bg-surface">
      <h3>
        <button
          type="button"
          onClick={() => onToggle(id)}
          aria-expanded={open}
          /*
           * `aria-controls` only while the panel exists. An IDREF that
           * resolves to nothing is not a harmless leftover — assistive
           * technology is told this button controls a region and then finds
           * no region, and the collapsed state is the common case, so that
           * was true for most of the buttons on the page at any moment.
           * `aria-expanded` is what carries the state; `aria-controls` is
           * only meaningful once there is something to point at.
           */
          aria-controls={open ? panelId : undefined}
          className="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-surface-sunken"
        >
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium text-ink">{title}</span>
            <span
              className={cn(
                "block truncate text-[0.8125rem]",
                warning ? "text-danger" : "text-ink-subtle",
              )}
            >
              {warning ? "Check contrast" : summary}
            </span>
          </span>
          <Icon
            d={ICONS.chevron}
            className={cn("h-4 w-4 shrink-0 text-ink-subtle transition-transform", open && "rotate-180")}
          />
        </button>
      </h3>

      {open ? (
        <div id={panelId} className="border-t border-border p-3">
          {children}
        </div>
      ) : null}
    </section>
  );
}

/* ── Theme ────────────────────────────────────────────────────────────────── */

function ThemePicker({
  design,
  onChange,
}: {
  design: DesignConfig;
  onChange: (design: DesignConfig) => void;
}) {
  const current = resolveDesign(design).theme;

  /**
   * Switching theme clears the sub-choices, and keeps the palette.
   *
   * A theme is a set of decisions about shape and weight that hold together;
   * carrying Bold's pill buttons and tight spacing into Paper produces neither
   * theme. Colours are different — somebody who picked their own accent picked
   * it for a reason and would not expect a theme to take it back — so those
   * survive, and Reset is there for when they should not.
   */
  function choose(theme: ThemeId) {
    onChange({ theme, ...(design.colors ? { colors: design.colors } : {}) });
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        {THEME_ORDER.map((theme) => (
          <ThemeSwatch
            key={theme}
            theme={theme}
            selected={theme === current}
            onSelect={() => choose(theme)}
          />
        ))}
      </div>
      <p className="mt-3 text-[0.8125rem] leading-relaxed text-ink-subtle">
        A theme sets the background, type, buttons and spacing at once. Your
        links, images and text are never touched.
      </p>
    </>
  );
}

/* ── Colours ──────────────────────────────────────────────────────────────── */

const COLOR_LABELS: Record<keyof Palette, string> = {
  background: "Page background",
  text: "Text",
  muted: "Secondary text",
  accent: "Accent",
  buttonBackground: "Button",
  buttonText: "Button label",
};

function ColorSection({
  design,
  resolvedColors,
  onChange,
}: {
  design: DesignConfig;
  resolvedColors: Palette;
  onChange: (next: Partial<DesignConfig>) => void;
}) {
  const warnings = paletteWarnings(resolvedColors);

  const set = (key: keyof Palette, value: string) =>
    onChange({ colors: { ...design.colors, [key]: value } });

  return (
    <div className="space-y-3">
      {PALETTE_KEYS.map((key) => (
        <ColorRow
          key={key}
          label={COLOR_LABELS[key]}
          value={resolvedColors[key]}
          onChange={(value) => set(key, value)}
          warning={warnings.find((entry) => entry.key === key)?.message}
        />
      ))}

      {design.colors ? (
        <button
          type="button"
          onClick={() => onChange({ colors: undefined })}
          className="text-[0.8125rem] text-ink-subtle underline underline-offset-2 transition-colors hover:text-ink"
        >
          Use the theme&rsquo;s colours
        </button>
      ) : null}
    </div>
  );
}

/**
 * One colour, editable two ways.
 *
 * A native colour input for people who want to pick, and a hex field for
 * people who have a brand colour written down. The text field commits only
 * when it holds a complete six-digit hex, so typing the first character of
 * `#1a1a1a` does not repaint the page black on the way through.
 */
function ColorRow({
  label,
  value,
  onChange,
  warning,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  warning?: string;
}) {
  const id = useId();
  const [text, setText] = useState(value);

  // The resolved value is the truth; a theme change should move this field.
  if (text.toLowerCase() !== value && document.activeElement?.id !== `${id}-hex`) {
    setText(value);
  }

  return (
    <div>
      <div className="flex items-center gap-2.5">
        <input
          id={id}
          type="color"
          value={value}
          onChange={(event) => {
            setText(event.target.value);
            onChange(event.target.value);
          }}
          aria-label={label}
          className="h-9 w-9 shrink-0 cursor-pointer rounded-control border border-border bg-transparent p-0.5"
        />
        <label htmlFor={id} className="min-w-0 flex-1 text-[0.8125rem] text-ink">
          {label}
        </label>
        <input
          id={`${id}-hex`}
          value={text}
          onChange={(event) => {
            const next = event.target.value;
            setText(next);
            if (HEX_PATTERN.test(next.trim().toLowerCase())) onChange(next.trim().toLowerCase());
          }}
          onBlur={() => setText(value)}
          aria-label={`${label} hex value`}
          spellCheck={false}
          className="h-9 w-24 shrink-0 rounded-control bg-surface-sunken px-2 font-mono text-[0.8125rem] uppercase ring-1 ring-border focus:ring-2 focus:ring-accent focus:outline-none"
        />
      </div>

      {warning ? (
        <p role="status" className="mt-1.5 text-[0.8125rem] leading-snug text-danger">
          {warning}
        </p>
      ) : null}
    </div>
  );
}

/* ── Background ───────────────────────────────────────────────────────────── */

function BackgroundSection({
  background,
  onChange,
  onClear,
  customised,
}: {
  background: BackgroundConfig;
  onChange: (background: BackgroundConfig) => void;
  onClear: () => void;
  customised: boolean;
}) {
  return (
    <div className="space-y-4">
      <ChoiceField
        label="Type"
        value={background.kind}
        onChange={(kind) => {
          // Each kind carries what it needs, so switching never leaves a
          // background referring to something that is not there.
          if (kind === "theme") return onClear();
          if (kind === "solid") return onChange({ kind, color: background.color ?? "#111111" });
          if (kind === "gradient") {
            return onChange({
              kind,
              gradient: background.gradient ?? { from: "#1b2430", to: "#0b0d11", angle: 180 },
            });
          }
          return onChange({
            kind,
            image: background.image ?? { url: "", position: "center", overlay: 45, blur: false },
          });
        }}
        options={[
          { value: "theme" as const, label: "Theme" },
          { value: "solid" as const, label: "Solid" },
          { value: "gradient" as const, label: "Gradient" },
          { value: "image" as const, label: "Image" },
        ]}
      />

      {background.kind === "gradient" && background.gradient ? (
        <div className="space-y-3">
          <div className="flex gap-3">
            <SmallColor
              label="From"
              value={background.gradient.from}
              onChange={(from) =>
                onChange({ ...background, gradient: { ...background.gradient!, from } })
              }
            />
            <SmallColor
              label="To"
              value={background.gradient.to}
              onChange={(to) =>
                onChange({ ...background, gradient: { ...background.gradient!, to } })
              }
            />
          </div>
          <AngleField
            value={background.gradient.angle}
            onChange={(angle) =>
              onChange({ ...background, gradient: { ...background.gradient!, angle } })
            }
          />
        </div>
      ) : null}

      {background.kind === "image" && background.image ? (
        <div className="space-y-4">
          <ImagePicker
            label="background"
            url={background.image.url.length > 0 ? background.image.url : null}
            onChange={(url) =>
              onChange({ ...background, image: { ...background.image!, url: url ?? "" } })
            }
          />

          <ChoiceField
            label="Position"
            value={background.image.position}
            onChange={(position) =>
              onChange({ ...background, image: { ...background.image!, position } })
            }
            options={[
              { value: "center" as const, label: "Centre" },
              { value: "top" as const, label: "Top" },
              { value: "bottom" as const, label: "Bottom" },
            ]}
          />

          <div>
            <label
              htmlFor="bg-overlay"
              className="mb-1.5 flex items-baseline justify-between text-[0.8125rem] font-medium text-ink"
            >
              Overlay
              <span className="font-mono text-[0.6875rem] text-ink-subtle">
                {background.image.overlay}%
              </span>
            </label>
            <input
              id="bg-overlay"
              type="range"
              min={0}
              max={85}
              step={5}
              value={background.image.overlay}
              onChange={(event) =>
                onChange({
                  ...background,
                  image: { ...background.image!, overlay: Number(event.target.value) },
                })
              }
              className="w-full accent-accent"
            />
            <p className="mt-1 text-[0.8125rem] leading-snug text-ink-subtle">
              Your page colour, laid over the photo. Text on a busy image is
              unreadable without some of this.
            </p>
          </div>

          <label className="flex items-center gap-2 text-[0.8125rem] text-ink">
            <input
              type="checkbox"
              checked={background.image.blur}
              onChange={(event) =>
                onChange({
                  ...background,
                  image: { ...background.image!, blur: event.target.checked },
                })
              }
              className="h-4 w-4 accent-accent"
            />
            Blur the image
          </label>
        </div>
      ) : null}

      {background.kind === "solid" ? (
        <SmallColor
          label="Colour"
          value={background.color ?? "#111111"}
          onChange={(color) => onChange({ ...background, color })}
        />
      ) : null}

      {customised && background.kind !== "theme" ? (
        <button
          type="button"
          onClick={onClear}
          className="text-[0.8125rem] text-ink-subtle underline underline-offset-2 transition-colors hover:text-ink"
        >
          Use the theme&rsquo;s background
        </button>
      ) : null}
    </div>
  );
}

function SmallColor({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <div className="min-w-0 flex-1">
      <label htmlFor={id} className="mb-1.5 block text-[0.8125rem] font-medium text-ink">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-9 w-9 shrink-0 cursor-pointer rounded-control border border-border bg-transparent p-0.5"
        />
        <span className="truncate font-mono text-[0.75rem] text-ink-subtle uppercase">{value}</span>
      </div>
    </div>
  );
}

/** Eight directions as a compass, which is faster to read than eight numbers. */
const ANGLE_LABELS: Record<GradientAngle, string> = {
  0: "↑",
  45: "↗",
  90: "→",
  135: "↘",
  180: "↓",
  225: "↙",
  270: "←",
  315: "↖",
};

function AngleField({
  value,
  onChange,
}: {
  value: GradientAngle;
  onChange: (angle: GradientAngle) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-[0.8125rem] font-medium text-ink">Direction</legend>
      <div className="flex flex-wrap gap-1.5">
        {GRADIENT_ANGLES.map((angle) => (
          <button
            key={angle}
            type="button"
            onClick={() => onChange(angle)}
            aria-pressed={angle === value}
            aria-label={`${angle} degrees`}
            className={cn(
              "h-8 w-8 rounded-control text-sm transition-colors",
              angle === value
                ? "bg-ink text-canvas"
                : "bg-surface-sunken text-ink-muted hover:text-ink",
            )}
          >
            <span aria-hidden>{ANGLE_LABELS[angle]}</span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}

/* ── Typography ───────────────────────────────────────────────────────────── */

function TypographySection({
  design,
  onChange,
}: {
  design: DesignConfig;
  onChange: (next: Partial<DesignConfig>) => void;
}) {
  const resolved = resolveDesign(design);

  return (
    <div className="space-y-4">
      <fieldset>
        <legend className="mb-1.5 text-[0.8125rem] font-medium text-ink">Typeface</legend>
        <div className="space-y-1.5">
          {FONT_ORDER.map((font) => (
            <button
              key={font}
              type="button"
              onClick={() =>
                onChange({ typography: { ...design.typography, font } })
              }
              aria-pressed={font === resolved.font}
              className={cn(
                "flex w-full items-baseline gap-2 rounded-control px-2.5 py-2 text-left transition-colors",
                font === resolved.font ? "bg-surface-sunken" : "hover:bg-surface-sunken",
              )}
            >
              <span className="min-w-0 flex-1">
                <span className="block text-[0.8125rem] font-medium text-ink">
                  {FONTS[font].name}
                </span>
                <span className="block text-[0.75rem] text-ink-subtle">
                  {FONTS[font].description}
                </span>
              </span>
              {font === resolved.font ? (
                <span aria-hidden className="text-[0.75rem] text-ink-subtle">
                  Selected
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </fieldset>

      <ChoiceField
        label="Size"
        value={resolved.scale}
        onChange={(scale) => onChange({ typography: { ...design.typography, scale } })}
        options={[
          { value: "compact" as const, label: "Compact" },
          { value: "standard" as const, label: "Standard" },
          { value: "spacious" as const, label: "Spacious" },
        ]}
      />
    </div>
  );
}

/* ── Buttons and blocks ───────────────────────────────────────────────────── */

function ButtonSection({
  design,
  onChange,
}: {
  design: DesignConfig;
  onChange: (next: Partial<DesignConfig>) => void;
}) {
  const resolved = resolveDesign(design);

  return (
    <div className="space-y-4">
      <ChoiceField
        label="Button style"
        value={resolved.buttonStyle}
        onChange={(style) => onChange({ buttons: { ...design.buttons, style } })}
        options={[
          { value: "filled" as const, label: "Filled" },
          { value: "outline" as const, label: "Outline" },
          { value: "soft" as const, label: "Soft" },
          { value: "minimal" as const, label: "Minimal" },
          { value: "glass" as const, label: "Glass" },
        ]}
      />

      <ChoiceField
        label="Shape"
        value={resolved.buttonShape}
        onChange={(shape) => onChange({ buttons: { ...design.buttons, shape } })}
        options={[
          { value: "square" as const, label: "Square" },
          { value: "rounded" as const, label: "Rounded" },
          { value: "pill" as const, label: "Pill" },
        ]}
      />

      <ChoiceField
        label="Blocks"
        value={resolved.blockStyle}
        onChange={(style) => onChange({ blocks: { style } })}
        options={[
          { value: "flat" as const, label: "Flat" },
          { value: "card" as const, label: "Card" },
          { value: "glass" as const, label: "Glass" },
          { value: "minimal" as const, label: "Minimal" },
        ]}
      />

      <ChoiceField
        label="Social icons"
        value={resolved.socialStyle}
        onChange={(style) => onChange({ socials: { style } })}
        options={[
          { value: "plain" as const, label: "Plain" },
          { value: "circle" as const, label: "Circle" },
          { value: "outline" as const, label: "Outline" },
        ]}
      />
    </div>
  );
}

/* ── Layout ───────────────────────────────────────────────────────────────── */

function LayoutSection({
  design,
  onChange,
}: {
  design: DesignConfig;
  onChange: (next: Partial<DesignConfig>) => void;
}) {
  const resolved = resolveDesign(design);
  const layout = design.layout;

  return (
    <div className="space-y-4">
      <ChoiceField
        label="Width"
        value={resolved.width}
        onChange={(width) => onChange({ layout: { ...layout, width } })}
        options={[
          { value: "compact" as const, label: "Compact" },
          { value: "standard" as const, label: "Standard" },
          { value: "wide" as const, label: "Wide" },
        ]}
      />

      <ChoiceField
        label="Spacing"
        value={resolved.spacing}
        onChange={(spacing) => onChange({ layout: { ...layout, spacing } })}
        options={[
          { value: "tight" as const, label: "Tight" },
          { value: "standard" as const, label: "Standard" },
          { value: "relaxed" as const, label: "Relaxed" },
        ]}
      />

      <ChoiceField
        label="Header"
        value={resolved.header}
        onChange={(header) => onChange({ layout: { ...layout, header } })}
        options={[
          { value: "centered" as const, label: "Centred" },
          { value: "compact" as const, label: "Beside the name" },
        ]}
      />

      <ChoiceField
        label="Photo size"
        value={resolved.avatar}
        onChange={(avatar) => onChange({ layout: { ...layout, avatar } })}
        options={[
          { value: "standard" as const, label: "Standard" },
          { value: "large" as const, label: "Large" },
        ]}
      />
    </div>
  );
}

/* ── Reset ────────────────────────────────────────────────────────────────── */

/**
 * Back to the theme, and no further.
 *
 * Resets presentation and nothing else — the confirmation says so, because
 * "Reset design" beside a page somebody spent an hour building is a frightening
 * button and the fear is the thing to address. The theme itself is kept: a
 * creator on Noir who resets wants Noir without their experiments, not
 * Minimal.
 */
function ResetDesign({
  design,
  onChange,
}: {
  design: DesignConfig;
  onChange: (design: DesignConfig) => void;
}) {
  const customised = Object.keys(design).some((key) => key !== "theme");
  if (!customised) return null;

  return (
    <button
      type="button"
      onClick={() => {
        const ok = window.confirm(
          "Reset every design change back to the theme? Your links, images and text stay exactly as they are.",
        );
        if (ok) onChange(design.theme ? { theme: design.theme } : {});
      }}
      className="flex h-9 w-full items-center justify-center rounded-control text-[0.8125rem] text-ink-subtle transition-colors hover:bg-surface-sunken hover:text-ink"
    >
      Reset design
    </button>
  );
}
