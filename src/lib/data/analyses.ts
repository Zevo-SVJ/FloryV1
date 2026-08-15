"use client";

import { firestore } from "@/lib/firebase/client";
import {
  analysesPath,
  analysisPath,
  newUserDoc,
  userPath,
  type AnalysisSummary,
} from "@/lib/data/schema";
import type { PerceptionReport } from "@/types/report";

/**
 * Where finished reports live.
 *
 * Two stores behind one interface. A signed-in person's reports go to Firestore
 * under their own uid and follow them between devices. Everyone else's stay in
 * this browser — which is worth having, because the most common reason to want
 * an old report back is to compare it with a new one an hour later, and asking
 * someone to make an account before they have seen the product is a bad trade.
 *
 * When someone signs in, `adopt()` moves what is on the device into their
 * account, so the report they ran before signing up is not lost.
 */

export interface AnalysisStore {
  readonly durable: boolean;
  list(limit?: number): Promise<AnalysisSummary[]>;
  get(id: string): Promise<PerceptionReport | null>;
  save(report: PerceptionReport): Promise<void>;
  remove(id: string): Promise<void>;
}

const summarise = (report: PerceptionReport): AnalysisSummary => ({
  id: report.id,
  createdAt: report.createdAt,
  overall: report.overall,
  archetype: report.archetype,
  headline: report.headline,
});

const newestFirst = (a: { createdAt: string }, b: { createdAt: string }) =>
  b.createdAt.localeCompare(a.createdAt);

/* ── This device ──────────────────────────────────────────────────────────── */

const KEY = "blink.analyses.v1";
const DEVICE_CAP = 24;

function readLocal(): PerceptionReport[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PerceptionReport[]) : [];
  } catch {
    return [];
  }
}

function writeLocal(reports: PerceptionReport[]) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(reports.slice(0, DEVICE_CAP)));
  } catch {
    // Storage full or blocked. History is a convenience, never a requirement.
  }
}

export const deviceStore: AnalysisStore = {
  durable: false,

  async list(limit = DEVICE_CAP) {
    return readLocal().sort(newestFirst).slice(0, limit).map(summarise);
  },

  async get(id) {
    return readLocal().find((report) => report.id === id) ?? null;
  },

  async save(report) {
    const kept = readLocal().filter((existing) => existing.id !== report.id);
    writeLocal([report, ...kept].sort(newestFirst));
  },

  async remove(id) {
    writeLocal(readLocal().filter((report) => report.id !== id));
  },
};

/* ── An account ───────────────────────────────────────────────────────────── */

export function accountStore(uid: string): AnalysisStore {
  return {
    durable: true,

    async list(limit = 40) {
      const db = firestore();
      if (!db) return [];
      const { collection, getDocs, limit: cap, orderBy, query } = await import(
        "firebase/firestore"
      );

      const snapshot = await getDocs(
        query(
          collection(await db, analysesPath(uid)),
          orderBy("createdAt", "desc"),
          cap(limit),
        ),
      );

      return snapshot.docs.map((entry) => {
        const data = entry.data() as Partial<AnalysisSummary>;
        return {
          id: entry.id,
          createdAt: data.createdAt ?? new Date(0).toISOString(),
          overall: data.overall ?? 0,
          archetype: data.archetype ?? "",
          headline: data.headline ?? "",
        };
      });
    },

    async get(id) {
      const db = firestore();
      if (!db) return null;
      const { doc, getDoc } = await import("firebase/firestore");
      const snapshot = await getDoc(doc(await db, analysisPath(uid, id)));
      if (!snapshot.exists()) return null;
      const data = snapshot.data() as { report?: PerceptionReport };
      return data.report ?? null;
    },

    async save(report) {
      const db = firestore();
      if (!db) return;
      const { doc, setDoc } = await import("firebase/firestore");

      /* The summary fields are duplicated alongside the report so the history
         list is one cheap query rather than a full read of every report. */
      await setDoc(doc(await db, analysisPath(uid, report.id)), {
        ...summarise(report),
        uid,
        report,
      });
    },

    async remove(id) {
      const db = firestore();
      if (!db) return;
      const { deleteDoc, doc } = await import("firebase/firestore");
      await deleteDoc(doc(await db, analysisPath(uid, id)));
    },
  };
}

/** Create the user document on first sign-in, and leave it alone after that. */
export async function ensureUserDoc(user: {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoUrl: string | null;
}): Promise<void> {
  const db = firestore();
  if (!db) return;

  const { doc, getDoc, setDoc } = await import("firebase/firestore");
  const ref = doc(await db, userPath(user.uid));
  const existing = await getDoc(ref);

  if (existing.exists()) {
    // Keep the parts Google may have changed; never touch entitlement.
    await setDoc(
      ref,
      {
        displayName: user.displayName,
        email: user.email,
        photoUrl: user.photoUrl,
      },
      { merge: true },
    );
    return;
  }

  await setDoc(ref, newUserDoc(user));
}

/**
 * Move anything on this device into the account that just signed in.
 *
 * Runs once per sign-in and clears the device copy afterwards, so a shared
 * computer does not hand one person's report to the next.
 */
export async function adopt(uid: string): Promise<number> {
  const local = readLocal();
  if (local.length === 0) return 0;

  const store = accountStore(uid);
  let moved = 0;

  for (const report of local) {
    try {
      await store.save(report);
      moved += 1;
    } catch {
      // Leave the device copy in place if the write failed.
      return moved;
    }
  }

  writeLocal([]);
  return moved;
}
