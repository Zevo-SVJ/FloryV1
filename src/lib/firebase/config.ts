/**
 * Firebase configuration, and whether there is any.
 *
 * Firebase's browser config is public by design — it identifies a project, it
 * does not authorise anything. Access is decided by Firestore rules, which is
 * why these values are safe in the bundle and why the app can ship without
 * them: with no project configured, Blink runs signed out and says so, rather
 * than pretending to have accounts.
 */

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

const RAW = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/** The config, or null when the deployment has none. */
export function firebaseConfig(): FirebaseConfig | null {
  const entries = Object.entries(RAW);
  if (entries.some(([, value]) => !value || value.trim().length === 0)) return null;
  return Object.fromEntries(
    entries.map(([key, value]) => [key, value!.trim()]),
  ) as unknown as FirebaseConfig;
}

export const authConfigured = () => firebaseConfig() !== null;

export const firebaseProjectId = () => firebaseConfig()?.projectId ?? null;
