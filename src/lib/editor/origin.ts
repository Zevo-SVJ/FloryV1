import { siteUrl } from "@/lib/env";

/**
 * The address a creator's page lives at, without the scheme.
 *
 * `showme.at/alex` rather than `https://showme.at/alex`: this is shown to a
 * person as an address they will type into a bio, and the scheme is noise in
 * that context. `siteUrl()` reads `NEXT_PUBLIC_*`, which Next.js inlines at
 * build time, so this is safe to call from a Client Component.
 */
export const siteOrigin = (): string => siteUrl().replace(/^https?:\/\//, "");
