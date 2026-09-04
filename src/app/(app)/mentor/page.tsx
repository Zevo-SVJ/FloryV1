import type { Metadata } from "next";
import { Forbidden } from "@/components/states/forbidden";
import { SectionPlaceholder } from "@/components/states/section-placeholder";
import { checkAccess, requireSection } from "@/lib/lock/access";

export const metadata: Metadata = { title: "Mentor" };

/**
 * The mentor area, gated on the role.
 *
 * The gate is here, in the page, rather than in the proxy. The proxy knows
 * nothing about roles — it verifies a session, and reading a profile from the
 * database on every request in front of every route would put a query in the
 * path of every navigation to save a redirect. So the role is read once, on the
 * server, where the page is rendered, and the answer decides what is rendered.
 *
 * There is nothing to protect yet. The gate is here anyway, because the pattern
 * every role-gated page in Prompt 6 will copy needs to exist before there are
 * six of them written six different ways.
 */
export default async function MentorPage() {
  const section = requireSection("/mentor");
  const { profile, allowed } = await checkAccess(section.access);

  if (!allowed) return <Forbidden role={profile.role} />;
  return <SectionPlaceholder section={section} />;
}
