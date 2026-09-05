import type { Metadata } from "next";
import { Forbidden } from "@/components/states/forbidden";
import { SectionPlaceholder } from "@/components/states/section-placeholder";
import { checkAccess, requireSection } from "@/lib/lock/access";

export const metadata: Metadata = { title: "Admin" };

/**
 * Gated on the role, in the page rather than in the proxy.
 *
 * The proxy knows nothing about roles: reading a profile from the database in
 * front of every route would put a query in the path of every navigation to
 * save a redirect. The role is read once, on the server, where the page
 * renders, and the answer decides what is rendered.
 *
 * There is nothing to protect yet. The gate is here anyway, because the pattern
 * Prompt 6 will copy needs to exist before there are six of them written six
 * different ways.
 */
export default async function AdminPage() {
  const section = requireSection("/admin");
  const { profile, allowed } = await checkAccess(section.access);

  if (!allowed) return <Forbidden role={profile.role} />;
  return <SectionPlaceholder href="/admin" />;
}
