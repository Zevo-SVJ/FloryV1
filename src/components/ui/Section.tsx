import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionProps {
  id?: string;
  children: ReactNode;
  className?: string;
  /** Full-viewport scenes get `screen`; the rest breathe on their own terms. */
  height?: "screen" | "auto";
  /** A hairline at the top separates chapters without drawing a box. */
  divider?: boolean;
}

export function Section({
  id,
  children,
  className,
  height = "auto",
  divider = false,
}: SectionProps) {
  return (
    <section
      id={id}
      className={cn(
        "relative w-full scroll-mt-24",
        height === "screen"
          ? "flex min-h-[100svh] flex-col justify-center py-24 md:py-28"
          : "py-24 md:py-36 lg:py-44",
        className,
      )}
    >
      {divider ? (
        <div aria-hidden className="edge absolute inset-x-0 top-0">
          <div className="hairline" />
        </div>
      ) : null}
      {children}
    </section>
  );
}

/** Small caps label. Used sparingly — it is the only decoration on the page. */
export function Eyebrow({
  children,
  className,
  accent = false,
}: {
  children: ReactNode;
  className?: string;
  accent?: boolean;
}) {
  return (
    <p
      className={cn(
        "text-eyebrow font-medium uppercase",
        accent ? "text-accent" : "text-ink-faint",
        className,
      )}
    >
      {children}
    </p>
  );
}
