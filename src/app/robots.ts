import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/env";

/**
 * What crawlers may look at.
 *
 * Creator pages are the point of the product and are meant to be found, so the
 * default is allow. What is excluded is everything that is not a creator page:
 * the account surfaces, which are behind a session and would only ever produce
 * a login redirect in an index, and the API.
 *
 * The exclusions are prefixes that cannot collide with a username — `login`,
 * `dashboard` and the rest are all reserved names — so no rule here can
 * accidentally hide somebody's page.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/dashboard", "/editor", "/onboarding", "/login", "/signup"],
    },
    host: siteUrl(),
  };
}
