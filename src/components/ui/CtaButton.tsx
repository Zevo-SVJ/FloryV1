"use client";

import { useAnalyze } from "@/analyze/AnalyzeContext";
import { Button } from "@/components/ui/Button";
import { IconArrowRight } from "@/components/ui/Icons";

/**
 * The product's one call to action, wherever it appears.
 *
 * It opens the analyze flow. It never scrolls to a section — a button that
 * says "Analyze my profile" and then moves the page is the single most
 * common way a consumer product feels like a website.
 */
export function CtaButton({
  size = "lg",
  variant = "primary",
  block = false,
  label = "Analyze my profile",
  withArrow = true,
}: {
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "secondary" | "ghost";
  block?: boolean;
  label?: string;
  withArrow?: boolean;
}) {
  const { open } = useAnalyze();

  return (
    <Button
      size={size}
      variant={variant}
      block={block}
      onClick={open}
      trailing={withArrow ? <IconArrowRight className="h-[1.05rem] w-[1.05rem]" /> : undefined}
    >
      {label}
    </Button>
  );
}
