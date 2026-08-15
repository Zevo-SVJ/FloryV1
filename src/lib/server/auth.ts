import { firebaseProjectId } from "@/lib/firebase/config";
import { log } from "@/lib/server/logger";

/**
 * Verifying a Firebase ID token, without the admin SDK.
 *
 * The browser sends the token it already has; the server checks the signature
 * against Google's published keys and then checks the claims. No service
 * account, no private key in the deployment, nothing to leak — and no
 * dependency on a Node-only library, so this works on an edge runtime too.
 *
 * Nothing here is a permission system. Blink's actual data boundary is
 * Firestore's own rules, which run at Google and cannot be talked past. This
 * exists so the server can say "this request really is that user" — for rate
 * limiting, and for anything that later needs to write on someone's behalf.
 */

const JWKS_URL =
  "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";

const ISSUER = (projectId: string) => `https://securetoken.google.com/${projectId}`;

interface Jwk extends JsonWebKey {
  kid?: string;
}

let cache: { keys: Map<string, CryptoKey>; until: number } | null = null;

async function keys(): Promise<Map<string, CryptoKey>> {
  if (cache && cache.until > Date.now()) return cache.keys;

  const response = await fetch(JWKS_URL);
  if (!response.ok) throw new Error(`jwks ${response.status}`);

  const body = (await response.json()) as { keys: Jwk[] };
  const imported = new Map<string, CryptoKey>();

  for (const jwk of body.keys) {
    if (!jwk.kid) continue;
    imported.set(
      jwk.kid,
      await crypto.subtle.importKey(
        "jwk",
        jwk,
        { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
        false,
        ["verify"],
      ),
    );
  }

  // Google rotates daily; an hour is well inside that and keeps the hot path
  // free of a network round trip.
  cache = { keys: imported, until: Date.now() + 60 * 60 * 1000 };
  return imported;
}

function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

interface Claims {
  sub?: string;
  aud?: string;
  iss?: string;
  exp?: number;
  iat?: number;
  email?: string;
}

/**
 * Returns the uid, or null for anything that does not verify.
 *
 * A bad token is treated exactly like no token: the caller falls back to
 * address-based limits. Nothing in Blink grants access on the strength of this,
 * so failing open here is not failing open anywhere.
 */
export async function verifyIdToken(token: string): Promise<string | null> {
  const projectId = firebaseProjectId();
  if (!projectId) return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [rawHeader, rawPayload, rawSignature] = parts as [string, string, string];

  try {
    const header = JSON.parse(new TextDecoder().decode(base64UrlToBytes(rawHeader))) as {
      kid?: string;
      alg?: string;
    };
    if (header.alg !== "RS256" || !header.kid) return null;

    const key = (await keys()).get(header.kid);
    if (!key) return null;

    const signed = new TextEncoder().encode(`${rawHeader}.${rawPayload}`);
    const valid = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      key,
      base64UrlToBytes(rawSignature),
      signed,
    );
    if (!valid) return null;

    const claims = JSON.parse(
      new TextDecoder().decode(base64UrlToBytes(rawPayload)),
    ) as Claims;

    const now = Math.floor(Date.now() / 1000);
    if (claims.aud !== projectId) return null;
    if (claims.iss !== ISSUER(projectId)) return null;
    if (!claims.exp || claims.exp <= now) return null;
    if (claims.iat && claims.iat > now + 60) return null;
    if (!claims.sub) return null;

    return claims.sub;
  } catch (error) {
    log.warn("auth.verify_failed", { reason: (error as Error).message });
    return null;
  }
}

/** The uid behind a request, or null when it is anonymous. */
export async function callerUid(request: Request): Promise<string | null> {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return verifyIdToken(header.slice(7).trim());
}
