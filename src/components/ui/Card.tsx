"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * One card. The only card.
 *
 * Same radius, same border, same elevation, same interior padding everywhere in
 * the product. Written as a component rather than a class list so a second
 * variant cannot quietly appear: if a card needs to look different, it gets a
 * named prop here and every existing card is checked against it.
 */
export function Card({
  children,
  className,
  tone = "plain",
  as: Element = "div",
}: {
  children: ReactNode;
  className?: string;
  /** `accent` is for the one card that carries the brand gradient. */
  tone?: "plain" | "sunken" | "accent";
  as?: "div" | "section" | "article";
}) {
  return (
    <Element
      className={cn(
        "relative flex h-full w-full flex-col overflow-hidden rounded-card",
        tone === "plain" && "border border-edge bg-white shadow-deck",
        tone === "sunken" && "border border-edge bg-sunken",
        tone === "accent" && "brand-gradient text-white shadow-accent",
        className,
      )}
    >
      {children}
    </Element>
  );
}

/** The interior rhythm every card shares. */
export function CardBody({
  children,
  className,
  scroll = false,
}: {
  children: ReactNode;
  className?: string;
  /** Long content scrolls inside the card rather than changing its size. */
  scroll?: boolean;
}) {
  const body = (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col p-5 sm:p-7",
        scroll && "overflow-y-auto overscroll-contain no-bar",
        className,
      )}
    >
      {children}
    </div>
  );

  if (!scroll) return body;

  /* A card that scrolls says so. Without this the last line is simply cut, and
     a cut line reads as a layout bug rather than as more to read. */
  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      {body}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white to-transparent"
        aria-hidden
      />
    </div>
  );
}
