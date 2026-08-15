"use client";

import { motion } from "framer-motion";
import { useAuth } from "@/auth/AuthContext";
import { BlinkMark } from "@/components/brand/Brand";
import { GoogleGlyph } from "@/components/ui/Icons";
import { EASE_OUT } from "@/lib/motion";

/**
 * Signing in.
 *
 * One provider, one button, one sentence about why. Blink asks for an account
 * only to keep reports — not to unlock the product — so the copy says exactly
 * that instead of implying a wall that is not there.
 */
export function SignInPanel({ titleId }: { titleId: string }) {
  const { signInWithGoogle, pending, error, status } = useAuth();

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 py-12 text-center sm:px-10 sm:py-16">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: EASE_OUT }}
      >
        <BlinkMark size={52} />
      </motion.div>

      <h2 id={titleId} className="display mt-7 text-title">
        Keep your reports
      </h2>
      <p className="mt-3 max-w-sm text-[0.9375rem] leading-relaxed text-ink-3">
        An account saves every analysis to your history, so you can reopen one in
        a month and see what actually moved. Everything else works without it.
      </p>

      {status === "unavailable" ? (
        <p className="mt-8 rounded-card border border-edge bg-sunken px-4 py-3 text-[0.8125rem] leading-relaxed text-ink-3">
          Accounts are not configured on this build, so reports are kept on this
          device instead.
        </p>
      ) : (
        <>
          <motion.button
            type="button"
            onClick={() => void signInWithGoogle()}
            disabled={pending}
            className="mt-9 inline-flex h-[3.25rem] items-center justify-center gap-3 rounded-full bg-white px-7 text-[1rem] font-medium text-ink shadow-rest ring-1 ring-edge-strong transition-colors hover:ring-ink/25 disabled:opacity-50"
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.985, y: 0 }}
            transition={{ duration: 0.16, ease: EASE_OUT }}
          >
            <GoogleGlyph className="h-[1.125rem] w-[1.125rem]" />
            {pending ? "Opening Google…" : "Continue with Google"}
          </motion.button>

          {error ? (
            <p role="alert" className="mt-4 max-w-xs text-[0.8125rem] text-low">
              {error}
            </p>
          ) : null}
        </>
      )}

      <p className="mt-8 max-w-xs text-[0.75rem] leading-relaxed text-ink-4">
        Blink stores your reports and your name. It does not store your
        screenshots.
      </p>
    </div>
  );
}
