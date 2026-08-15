"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { authConfigured } from "@/lib/firebase/config";
import { firebaseAuth } from "@/lib/firebase/client";

/**
 * Who is signed in.
 *
 * Four states, and the interface renders all four properly:
 *
 *   unavailable — no Firebase project on this deployment. Accounts are not
 *                 offered at all rather than offered and broken.
 *   restoring   — a session may exist; Firebase has not said yet. Everything
 *                 that depends on identity holds still, nothing flickers.
 *   signed-out  — no session.
 *   signed-in   — a session, persisted across visits.
 *
 * `restoring` is the state most apps get wrong: they render the signed-out
 * interface for 400ms and then swap it, which is the single clearest way to look
 * unfinished. Blink shows the previous shape until it knows.
 */

export interface BlinkUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoUrl: string | null;
  /** First name where we have one, for the one place the product says hello. */
  firstName: string | null;
}

export type AuthStatus = "unavailable" | "restoring" | "signed-out" | "signed-in";

interface AuthApi {
  status: AuthStatus;
  user: BlinkUser | null;
  /** Set while a sign-in is in flight, so the button can hold its own state. */
  pending: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  /** A fresh ID token for calling Blink's own API as this user. */
  idToken: () => Promise<string | null>;
  clearError: () => void;
}

const AuthContext = createContext<AuthApi | null>(null);

function toUser(raw: {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}): BlinkUser {
  const displayName = raw.displayName?.trim() || null;
  return {
    uid: raw.uid,
    displayName,
    email: raw.email,
    photoUrl: raw.photoURL,
    firstName: displayName?.split(/\s+/)[0] ?? null,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = authConfigured();
  const [status, setStatus] = useState<AuthStatus>(
    configured ? "restoring" : "unavailable",
  );
  const [user, setUser] = useState<BlinkUser | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tokenRef = useRef<(() => Promise<string>) | null>(null);

  useEffect(() => {
    if (!configured) return;
    const auth = firebaseAuth();
    if (!auth) return;

    let unsubscribe: (() => void) | null = null;
    let cancelled = false;

    void (async () => {
      const [instance, { onAuthStateChanged }] = await Promise.all([
        auth,
        import("firebase/auth"),
      ]);
      if (cancelled) return;

      unsubscribe = onAuthStateChanged(
        instance,
        (raw) => {
          if (raw) {
            tokenRef.current = () => raw.getIdToken();
            setUser(toUser(raw));
            setStatus("signed-in");
          } else {
            tokenRef.current = null;
            setUser(null);
            setStatus("signed-out");
          }
        },
        () => {
          // Firebase itself failed. Say signed out rather than spin forever.
          setStatus("signed-out");
        },
      );
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [configured]);

  /* First thing after a session appears: make sure the account has a profile
     document, and move anything analysed on this device before signing in into
     it. Both are best-effort — a failure here must never block the product. */
  useEffect(() => {
    if (status !== "signed-in" || !user) return;
    let live = true;

    void (async () => {
      const { adopt, ensureUserDoc } = await import("@/lib/data/analyses");
      if (!live) return;
      await ensureUserDoc(user).catch(() => {});
      if (!live) return;
      await adopt(user.uid).catch(() => {});
    })();

    return () => {
      live = false;
    };
  }, [status, user]);

  const signInWithGoogle = useCallback(async () => {
    const auth = firebaseAuth();
    if (!auth) return;

    setPending(true);
    setError(null);

    try {
      const [instance, { GoogleAuthProvider, signInWithPopup }] = await Promise.all([
        auth,
        import("firebase/auth"),
      ]);

      const provider = new GoogleAuthProvider();
      // Always let people choose which account, rather than silently reusing
      // whichever Google session the browser happens to hold.
      provider.setCustomParameters({ prompt: "select_account" });

      await signInWithPopup(instance, provider);
    } catch (raw) {
      const code = (raw as { code?: string }).code ?? "";
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
        // Not an error. They changed their mind.
      } else if (code === "auth/popup-blocked") {
        setError("Your browser blocked the sign-in window. Allow popups and try again.");
      } else if (code === "auth/network-request-failed") {
        setError("Blink could not reach Google. Check your connection and try again.");
      } else {
        setError("Sign-in did not complete. Try again in a moment.");
      }
    } finally {
      setPending(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    const auth = firebaseAuth();
    if (!auth) return;
    const [instance, { signOut: firebaseSignOut }] = await Promise.all([
      auth,
      import("firebase/auth"),
    ]);
    await firebaseSignOut(instance);
  }, []);

  const idToken = useCallback(async () => {
    try {
      return (await tokenRef.current?.()) ?? null;
    } catch {
      return null;
    }
  }, []);

  const api = useMemo<AuthApi>(
    () => ({
      status,
      user,
      pending,
      error,
      signInWithGoogle,
      signOut,
      idToken,
      clearError: () => setError(null),
    }),
    [status, user, pending, error, signInWithGoogle, signOut, idToken],
  );

  return <AuthContext.Provider value={api}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthApi {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
