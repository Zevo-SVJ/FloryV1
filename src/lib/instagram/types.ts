/**
 * What a connected Instagram account would give Blink.
 *
 * This is written against the shape of Instagram's own Graph API rather than
 * against what would be convenient, so that connecting it later is a matter of
 * implementing the provider — not of changing everything that reads from it.
 *
 * Blink does not have this connection today. Nothing in this directory returns
 * invented data, and nothing in the interface renders a connected state that has
 * not actually happened.
 */

/** Where a connection stands, from the product's point of view. */
export type ConnectionStatus =
  | "unavailable"
  | "disconnected"
  | "connecting"
  | "connected"
  | "expired"
  | "revoked";

export interface InstagramAccount {
  /** Instagram-scoped user id. Not the handle. */
  id: string;
  username: string;
  accountType: "PERSONAL" | "BUSINESS" | "CREATOR" | "UNKNOWN";
  mediaCount: number | null;
  followerCount: number | null;
  profilePictureUrl: string | null;
}

export interface InstagramMedia {
  id: string;
  mediaType: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  permalink: string;
  timestamp: string;
  likeCount: number | null;
  commentCount: number | null;
}

export interface Connection {
  status: ConnectionStatus;
  account: InstagramAccount | null;
  /** ISO timestamp of the last successful sync, if there has ever been one. */
  syncedAt: string | null;
  /** Scopes the connection actually holds, which may be fewer than requested. */
  scopes: string[];
}

export const DISCONNECTED: Connection = {
  status: "disconnected",
  account: null,
  syncedAt: null,
  scopes: [],
};

export const UNAVAILABLE: Connection = {
  status: "unavailable",
  account: null,
  syncedAt: null,
  scopes: [],
};

/** Thrown when something asks a provider for a capability it does not have. */
export class IntegrationUnavailableError extends Error {
  constructor(capability: string) {
    super(`Instagram ${capability} is not connected on this deployment.`);
    this.name = "IntegrationUnavailableError";
  }
}

/**
 * The one thing every provider must satisfy.
 *
 * `available` is the honesty switch: a provider that cannot do the work says so,
 * and callers branch on that rather than catching exceptions to find out.
 */
export interface InstagramProvider {
  readonly name: string;
  readonly available: boolean;

  /** Current state for a user, without side effects. */
  connection(uid: string): Promise<Connection>;

  /**
   * Step one of OAuth: where to send the browser.
   * `state` is the caller's CSRF token and is returned untouched by Instagram.
   */
  authorizeUrl(input: { uid: string; state: string; redirectUri: string }): Promise<string>;

  /** Step two: turn the code Instagram hands back into a stored connection. */
  completeAuthorization(input: {
    uid: string;
    code: string;
    redirectUri: string;
  }): Promise<Connection>;

  /** Refresh the profile fields Blink cares about. */
  refreshAccount(uid: string): Promise<InstagramAccount>;

  /** Recent media, newest first, for analysing a live grid rather than a screenshot. */
  recentMedia(input: { uid: string; limit: number }): Promise<InstagramMedia[]>;

  /** Forget the connection and drop the token. */
  disconnect(uid: string): Promise<void>;
}
