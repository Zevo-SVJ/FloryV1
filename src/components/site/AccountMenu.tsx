"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAnalyze } from "@/analyze/AnalyzeContext";
import { useAuth } from "@/auth/AuthContext";
import { IconHistory, IconSignOut } from "@/components/ui/Icons";
import { EASE_OUT } from "@/lib/motion";

/**
 * The account control.
 *
 * Four states, and none of them flicker. While the session is being restored it
 * holds a placeholder of exactly the avatar's size, so the bar does not reflow
 * when Firebase answers — the single most common way a signed-in app looks
 * unfinished in its first half-second.
 *
 * Where accounts are not configured at all, this renders history only, because
 * offering a sign-in that cannot work would be worse than not offering one.
 */
export function AccountMenu() {
  const { status, user, signOut } = useAuth();
  const { openHistory, openSignIn } = useAnalyze();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (status === "restoring") {
    return <span className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-sunken" />;
  }

  if (status === "unavailable") {
    return (
      <button
        type="button"
        onClick={openHistory}
        aria-label="Your analyses"
        className="flex h-8 w-8 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-sunken hover:text-ink"
      >
        <IconHistory className="h-[1.125rem] w-[1.125rem]" />
      </button>
    );
  }

  if (status === "signed-out" || !user) {
    return (
      <button
        type="button"
        onClick={openSignIn}
        className="rounded-full px-3.5 py-2 text-[0.875rem] text-ink-3 transition-colors hover:text-ink"
      >
        Sign in
      </button>
    );
  }

  const initial = (user.firstName ?? user.email ?? "?").charAt(0).toUpperCase();

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account, ${user.displayName ?? user.email ?? "signed in"}`}
        className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-sunken text-[0.8125rem] font-medium text-ink-2 ring-1 ring-edge transition-shadow hover:ring-edge-strong"
      >
        {user.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.photoUrl}
            alt=""
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover"
          />
        ) : (
          initial
        )}
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            role="menu"
            className="absolute right-0 top-[calc(100%+0.5rem)] w-56 overflow-hidden rounded-card border border-edge bg-white p-1.5 shadow-raise"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.2, ease: EASE_OUT }}
          >
            <div className="px-3 py-2.5">
              <p className="truncate text-[0.875rem] font-medium tracking-[-0.012em]">
                {user.displayName ?? "Signed in"}
              </p>
              {user.email ? (
                <p className="mt-0.5 truncate text-[0.75rem] text-ink-4">
                  {user.email}
                </p>
              ) : null}
            </div>

            <div className="my-1 h-px bg-edge" />

            <MenuItem
              icon={<IconHistory className="h-4 w-4" />}
              onClick={() => {
                setOpen(false);
                openHistory();
              }}
            >
              Your analyses
            </MenuItem>
            <MenuItem
              icon={<IconSignOut className="h-4 w-4" />}
              onClick={() => {
                setOpen(false);
                void signOut();
              }}
            >
              Sign out
            </MenuItem>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function MenuItem({
  children,
  icon,
  onClick,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-left text-[0.875rem] text-ink-2 transition-colors hover:bg-sunken hover:text-ink"
    >
      <span className="text-ink-4">{icon}</span>
      {children}
    </button>
  );
}
