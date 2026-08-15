import {
  IntegrationUnavailableError,
  UNAVAILABLE,
  type Connection,
  type InstagramAccount,
  type InstagramMedia,
  type InstagramProvider,
} from "@/lib/instagram/types";

/**
 * The provider Blink ships with today.
 *
 * It reports `available: false` and refuses every capability. That is
 * deliberate and it is the whole design: Instagram account connection requires
 * an app review and a set of credentials this product does not have, so rather
 * than mock a connected account — which would show people a grid that is not
 * theirs and a sync that never happened — the integration is present, typed and
 * switched off.
 *
 * Replacing it is one file and one line in `index.ts`. Everything that consumes
 * a connection already handles `status: "unavailable"`, because that is the only
 * status it has ever seen.
 */
export const unavailableProvider: InstagramProvider = {
  name: "unavailable",
  available: false,

  async connection(): Promise<Connection> {
    return UNAVAILABLE;
  },

  async authorizeUrl(): Promise<string> {
    throw new IntegrationUnavailableError("sign-in");
  },

  async completeAuthorization(): Promise<Connection> {
    throw new IntegrationUnavailableError("sign-in");
  },

  async refreshAccount(): Promise<InstagramAccount> {
    throw new IntegrationUnavailableError("profile sync");
  },

  async recentMedia(): Promise<InstagramMedia[]> {
    throw new IntegrationUnavailableError("media access");
  },

  async disconnect(): Promise<void> {
    // Nothing was ever connected, so this is already true.
  },
};
