import type { Metadata } from "next";
import { Forbidden } from "@/components/states/forbidden";
import { SectionPlaceholder } from "@/components/states/section-placeholder";
import { checkAccess, requireSection } from "@/lib/lock/access";

export const metadata: Metadata = { title: "Admin" };

/** Administration, gated on the role. See `mentor/page.tsx` for why here. */
export default async function AdminPage() {
  const section = requireSection("/admin");
  const { profile, allowed } = await checkAccess(section.access);

  if (!allowed) return <Forbidden role={profile.role} />;
  return <SectionPlaceholder section={section} />;
}
