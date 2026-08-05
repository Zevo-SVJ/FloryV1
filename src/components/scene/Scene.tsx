"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SceneProps {
  /** Fixed design-space width the children are composed against. */
  width: number;
  height: number;
  children: ReactNode;
  className?: string;
  /** What the animation shows, for anyone who cannot see it. */
  label: string;
}

/**
 * A fixed coordinate space that scales to fit its container.
 *
 * Motion graphics have to be composed in absolute pixels to hold their
 * composition; this keeps that composition intact from a 360px phone to a
 * wide desktop, and never lets a scene overflow its column.
 */
export function Scene({ width, height, children, className, label }: SceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const measure = (available: number) => setScale(Math.min(1, available / width));
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
