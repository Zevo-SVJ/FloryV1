import { supabaseEnv } from "@/lib/env";
import { checkUrl } from "@/lib/validation/url";

/**
 * Which image URLs this deployment is willing to render.
 *
 * Every image on a public page — avatar, image block, gallery item — is a
 * value a creator controls, and an `<img>` pointed at an arbitrary host is a
 * request this server or its image optimizer makes on a stranger's behalf. So
 * only this project's own Supabase Storage is rendered, and anything else is
 * dropped rather than fetched.
 *
 * The same host is given to `next/image` in `next.config.ts`, and it has to
 * be: the optimizer refuses a host it was not configured with, and a mismatch
 * would be a runtime error on a public page rather than a graceful fallback.
 *
 * This was `public-page/avatar.ts` in Phase 3, when the avatar was the only
 * image on the page. Phase 4 gives creators three more ways to add one, and
 * all four go through here.
 */

/** The host Supabase Storage serves from, or null when unconfigured. */
export function mediaHost(): string | null {
  const env = supabaseEnv();
  if (!env) return null;

  try {
    return new URL(env.url).hostname;
  } catch {
    return null;
  }
}

/**
 * The image, if it is one we will actually load.
 *
 * Returns null for a missing, malformed, non-https or foreign-hosted value.
 * Never throws: a bad string in one column must not take down a page.
 */
export function renderableMediaUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  if (checkUrl(value) !== null) return null;

  const host = mediaHost();
  if (!host) return null;

  try {
    const parsed = new URL(value);
    // `https` only: an http image on an https page is blocked as mixed content
    // anyway, and would show as a broken image rather than a clean fallback.
    if (parsed.protocol !== "https:") return null;
    return parsed.hostname === host ? parsed.toString() : null;
  } catch {
    return null;
  }
}

/** Whether a value would survive `renderableMediaUrl`. For zod refinements. */
export const isRenderableMediaUrl = (value: string): boolean =>
  renderableMediaUrl(value) !== null;
