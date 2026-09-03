import { designAttributes, designStyle } from "@/lib/design/resolve";
import { FONT_VARIABLES } from "@/lib/design/fonts";
import type { ResolvedDesign } from "@/lib/design/types";

/**
 * The one element that wears a creator's design.
 *
 * Everything below it styles itself from `var(--sm-…)` and from the `data-sm-*`
 * attributes set here, so this is the single place a design becomes a page.
 * The public route and the editor's preview both render it, which is what
 * makes "the preview matches" a property of the architecture rather than
 * something to keep checking.
 *
 * `FONT_VARIABLES` defines all four families' custom properties. That costs
 * about a kilobyte of `@font-face` CSS and downloads nothing: a browser fetches
 * a family only when something on the page is actually set in it, and exactly
 * one is.
 *
 * The backdrop is a real element rather than a pseudo-element because a
 * photograph may be blurred, and a filter on the page would blur the words on
 * it. It is `aria-hidden` and `pointer-events: none` — it is wallpaper.
 */
export function PageSurface({
  design,
  standalone = false,
  children,
}: {
  design: ResolvedDesign;
  /**
   * Whether this render is the whole document rather than a panel inside one.
   *
   * It decides one thing: whether the content column is a `<main>`. On the
   * public route it is — a screen reader's "skip to main content" has to land
   * on the creator's page, and an audit that counts landmarks found none here
   * at all. Inside the editor's preview it must not be, because that document
   * already has a `<main>` around the whole editor and two of them is not a
   * stronger landmark, it is an ambiguous one.
   */
  standalone?: boolean;
  children: React.ReactNode;
}) {
  const Shell = standalone ? "main" : "div";
  const showsBackdrop = design.background.kind === "image";

  return (
    <div
      className={`sm-page ${FONT_VARIABLES}`}
      style={designStyle(design)}
      {...designAttributes(design)}
    >
      {showsBackdrop ? (
        <div className="sm-backdrop" aria-hidden>
          <div className="sm-backdrop-image" />
          <div className="sm-backdrop-overlay" />
        </div>
      ) : null}

      <Shell className="sm-shell">{children}</Shell>
    </div>
  );
}
