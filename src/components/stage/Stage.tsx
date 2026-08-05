"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StageProps {
  /** Fixed design-space width the children are laid out against. */
  width: number;
  /** Fixed design-space height. */
  height: number;
  children: ReactNode;
  className?: string;
  /** Accessible description of the animation for screen readers. */
  label: string;
}

/**
 * A fixed coordinate space that scales to fit its container.
 *
 * Cinematics are choreographed in absolute pixels — that is the only way to
 * get motion graphics to hold their composition — and this keeps that
 * composition intact from a 360px phone to a wide desktop.
 */
export function Stage({ width, height, children, className, label }: StageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const measure = (available: number) => {
      setScale(Math.min(1, available / width));
    };

    measure(element.getBoundingClientRect().width);

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) measure(entry.contentRect.width);
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, [width]);

  return (
    <div
      ref={containerRef}
      className={cn("relative w-full", className)}
      style={{ height: height * scale }}
      role="img"
      aria-label={label}
    >
      <div
        aria-hidden
        className="absolute left-1/2 top-0"
        style={{
          width,
          height,
          transform: `translateX(-50%) scale(${scale})`,
          transformOrigin: "top center",
        }}
      >
        {children}
      </div>
    </div>
  );
}
