"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Arrows for the gallery, on the screens that need them.
 *
 * This is the only Client Component the public page can load, and it exists
 * for one reason: a trackpad user can swipe a horizontal list, a mouse user
 * cannot. Touch needs nothing — the scroller is CSS scroll-snap and the
 * gesture is the platform's.
 *
 * So the arrows are conditional on something real rather than on a breakpoint:
 * they appear only when the content is actually wider than its container, which
 * also means a two-image gallery on a wide screen shows no controls to press.
 * With JavaScript disabled nothing renders at all, which is correct — a button
 * that cannot work should not be on the page.
 *
 * The scroller is found by id rather than by ref because it is server
 * rendered. Keeping the images out of this component is the point: a gallery
 * ships a few hundred bytes of behaviour, not its own markup.
 */
export function GalleryControls({ scrollerId, label }: { scrollerId: string; label: string }) {
  const [state, setState] = useState({ overflowing: false, atStart: true, atEnd: false });
  const scroller = useRef<HTMLElement | null>(null);

  const measure = useCallback(() => {
    const element = scroller.current;
    if (!element) return;

    const { scrollLeft, scrollWidth, clientWidth } = element;
    // A pixel of slack: fractional layout widths mean `scrollLeft + clientWidth`
    // lands a hair short of `scrollWidth` at the true end.
    setState({
      overflowing: scrollWidth - clientWidth > 1,
      atStart: scrollLeft <= 1,
      atEnd: scrollLeft + clientWidth >= scrollWidth - 1,
    });
  }, []);

  useEffect(() => {
    const element = document.getElementById(scrollerId);
    if (!element) return;

    scroller.current = element;
    measure();

    element.addEventListener("scroll", measure, { passive: true });
    const observer = new ResizeObserver(measure);
    observer.observe(element);

    return () => {
      element.removeEventListener("scroll", measure);
      observer.disconnect();
    };
  }, [scrollerId, measure]);

  if (!state.overflowing) return null;

  /** One card plus its gap, so a press advances by exactly one image. */
  const step = (direction: 1 | -1) => {
    const element = scroller.current;
    if (!element) return;
    const card = element.firstElementChild as HTMLElement | null;
    const distance = card ? card.offsetWidth + 12 : element.clientWidth * 0.8;
    element.scrollBy({ left: distance * direction, behavior: "smooth" });
  };

  return (
    /*
     * Hidden below `sm`. On a phone the gesture is the platform's — the row is
     * scroll-snap and a swipe works with no JavaScript at all — so arrows there
     * are two more things to miss with a thumb rather than a way to move.
     */
    <div className="mt-3 hidden justify-end gap-2 sm:flex">
      <Arrow
        onClick={() => step(-1)}
        disabled={state.atStart}
        label={`Previous image in ${label}`}
        d="M15 18l-6-6 6-6"
      />
      <Arrow
        onClick={() => step(1)}
        disabled={state.atEnd}
        label={`Next image in ${label}`}
        d="M9 18l6-6-6-6"
      />
    </div>
  );
}

function Arrow({
  onClick,
  disabled,
  label,
  d,
}: {
  onClick: () => void;
  disabled: boolean;
  label: string;
  d: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="sm-arrow"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        className="h-4 w-4"
      >
        <path d={d} />
      </svg>
    </button>
  );
}
