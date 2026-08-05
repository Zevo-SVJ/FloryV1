import type { SVGProps } from "react";

/**
 * One icon set: 24px grid, 1.6 stroke, rounded ends. Drawn here rather than
 * pulled from a library so every line in the product shares a weight.
 */

type IconProps = SVGProps<SVGSVGElement>;

function Icon({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export function IconArrowRight(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 12h15" />
      <path d="M13 6l6 6-6 6" />
    </Icon>
  );
}

export function IconArrowDown(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 4.5v15" />
      <path d="M6 13.5l6 6 6-6" />
    </Icon>
  );
}

export function IconCheck(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4.5 12.5l5 5 10-11" />
    </Icon>
  );
}

export function IconClose(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 6l12 12M18 6L6 18" />
    </Icon>
  );
}

export function IconPlus(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 5v14M5 12h14" />
    </Icon>
  );
}

export function IconChevronDown(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 9.5l6 6 6-6" />
    </Icon>
  );
}

export function IconImage(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3" y="4.5" width="18" height="15" rx="3.5" />
      <circle cx="8.8" cy="10" r="1.5" />
      <path d="M3.6 17.4l4.3-4a2 2 0 012.7 0l2.4 2.2" />
      <path d="M13.6 15.2l2.2-2a2 2 0 012.7 0l1.9 1.8" />
    </Icon>
  );
}

export function IconUpload(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 16V4.5" />
      <path d="M7.5 9L12 4.5 16.5 9" />
      <path d="M4.5 15v2.5a2.5 2.5 0 002.5 2.5h10a2.5 2.5 0 002.5-2.5V15" />
    </Icon>
  );
}

export function IconLock(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="4.5" y="10.5" width="15" height="9.5" rx="2.5" />
      <path d="M8.2 10.5V8a3.8 3.8 0 017.6 0v2.5" />
    </Icon>
  );
}

export function IconRefresh(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M20.5 12a8.5 8.5 0 11-2.49-6.01L20.5 8.5" />
      <path d="M20.5 3.5v5h-5" />
    </Icon>
  );
}

export function IconTrend(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 16.5l5.5-5.5 3.5 3.5L20 7" />
      <path d="M15 7h5v5" />
    </Icon>
  );
}

export function IconAlert(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 8v5M12 16h.01" />
    </Icon>
  );
}

export function IconClock(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 1.8" />
    </Icon>
  );
}

/** Filled, not stroked — it sits inline with names at 12px. */
export function IconVerified({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden focusable="false">
      <path
        fill="currentColor"
        d="M12 1.8l2.5 2 3.2-.3 1.1 3 2.7 1.7-1 3.1 1 3.1-2.7 1.7-1.1 3-3.2-.3-2.5 2-2.5-2-3.2.3-1.1-3L2.5 15l1-3.1-1-3.1 2.7-1.7 1.1-3 3.2.3z"
      />
      <path
        fill="#fff"
        d="M10.8 15.2l-3-3 1.3-1.3 1.7 1.7 4.2-4.2 1.3 1.3z"
      />
    </svg>
  );
}

/** A heart, filled — used only in the reactions rail. */
export function IconHeart({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden focusable="false">
      <path
        fill="currentColor"
        d="M12 20.3l-1.1-1C6.1 15 3 12.2 3 8.8A4.8 4.8 0 017.8 4c1.7 0 3.3.8 4.2 2.1A5.2 5.2 0 0116.2 4 4.8 4.8 0 0121 8.8c0 3.4-3.1 6.2-7.9 10.5z"
      />
    </svg>
  );
}
