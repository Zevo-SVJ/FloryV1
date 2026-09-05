import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * The line that tells you what just happened.
 *
 * One component for both outcomes, because a success and a failure occupy the
 * same place in the form and must not move it. The difference is a border
 * colour and, more importantly, the live-region role: a failure is `alert` and
 * interrupts a screen reader, a confirmation is `status` and waits its turn.
 *
 * Left border rather than a filled panel. A block of tinted background at the
 * top of a form is the house style of every template on the internet; a
 * two-pixel rule and ordinary type is quieter and easier to read.
 */
export function Notice({
  tone,
  children,
}: {
  tone: "error" | "success";
  children: ReactNode;
}) {
  const error = tone === "error";

  return (
    <p
      role={error ? "alert" : "status"}
      className={cn(
        "border-l-2 py-1 pl-3 text-sm",
        error ? "border-danger text-danger" : "border-success text-ink-muted",
      )}
    >
      {children}
    </p>
  );
}
