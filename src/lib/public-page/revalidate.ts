import "server-only";

import { revalidatePath } from "next/cache";

/**
 * Drop a creator's cached page.
 *
 * `/[username]` is cached for up to a minute, which is the right trade for a
 * page that gets opened from a bio link — but only because anything that
 * changes it can say so immediately.
 *
 * There are two callers today and one tomorrow:
 *
 *   · Claiming a username. A page cached as a 404 before somebody signed up
 *     would keep 404ing for a minute after they did, which reads as the signup
 *     having failed. This is the reason it exists now rather than in Phase 4.
 *
 *   · Phase 4's editor, after every change a creator makes.
 *
 * Kept in one function so neither caller has to remember the path shape, and
 * so there is one place to change if pages ever gain a cache tag instead.
 */
export function revalidatePublicPage(username: string): void {
  revalidatePath(`/${username}`);
}
