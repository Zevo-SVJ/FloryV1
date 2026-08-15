"use client";

import type { FirebaseApp } from "firebase/app";
import type { Auth } from "firebase/auth";
import type { Firestore } from "firebase/firestore";
import { firebaseConfig } from "@/lib/firebase/config";

/**
 * Firebase, loaded on demand.
 *
 * Everything here is a dynamic import. Blink's landing page is the product's
 * shop window and it should not carry the auth SDK before anyone has asked to
 * sign in — so Firebase arrives with the sign-in sheet, or with the first
 * restored session, and never on a cold visit that only scrolls.
 *
 * Every accessor returns null when the deployment has no project. Callers guard
 * on null rather than on environment variables, so the type system keeps the
 * unconfigured path honest.
 */

let appPromise: Promise<FirebaseApp> | null = null;

export function firebaseApp(): Promise<FirebaseApp> | null {
  const config = firebaseConfig();
  if (!config) return null;

  appPromise ??= (async () => {
    const { getApp, getApps, initializeApp } = await import("firebase/app");
    return getApps().length > 0 ? getApp() : initializeApp(config);
  })();

  return appPromise;
}

let authPromise: Promise<Auth> | null = null;

export function firebaseAuth(): Promise<Auth> | null {
  const app = firebaseApp();
  if (!app) return null;

  authPromise ??= (async () => {
    const { getAuth, setPersistence, browserLocalPersistence } = await import(
      "firebase/auth"
    );
    const auth = getAuth(await app);

    /* Sessions survive the tab closing: someone who signed in last month is
       still signed in, which is the point of accounts in a product people come
       back to occasionally. A failure here — private mode, blocked storage —
       leaves the session in memory, which still works for the visit. */
    await setPersistence(auth, browserLocalPersistence).catch(() => {});
    return auth;
  })();

  return authPromise;
}

let dbPromise: Promise<Firestore> | null = null;

export function firestore(): Promise<Firestore> | null {
  const app = firebaseApp();
  if (!app) return null;

  dbPromise ??= (async () => {
    const { getFirestore } = await import("firebase/firestore");
    return getFirestore(await app);
  })();

  return dbPromise;
}
