import type { ReactNode } from "react";
import { SideRail } from "@/components/shell/side-rail";
import { TabBar } from "@/components/shell/tab-bar";
import { AccountBlock } from "@/components/layout/account-block";
import { requireProfile, getUser } from "@/lib/auth/dal";
import { areasFor, TAB_IDS } from "@/lib/lock/navigation";

/**
 * The application shell.
 *
 * Two jobs, and the order matters.
 *
 * First it insists on a session and a profile. `requireProfile()` runs here,
 * next to the render, and redirects if there is none. The proxy already turned
 * signed-out visitors away, but the proxy is a convenience — this is the check
 * that counts, and every route inside this group inherits it by being inside it.
 *
 * Second it draws the frame, and the frame is now two different things rather
 * than one thing shrunk.
 *
 *   Wide     a floating, collapsible rail beside the content
 *   Narrow   a floating tab bar over the content, and a sheet for the rest
 *
 * They are not the same component at two sizes. A phone gets four thumb-sized
 * tabs and a More sheet; a Mac gets six named destinations it can collapse to
 * icons. The old shell was a permanent 15rem panel on the left at every width
 * above `lg` and that same panel as a slide-in drawer below it — a desktop
 * pattern wearing a phone's clothes.
 *
 * Which links exist is still decided here, on the server, from a role read out
 * of the database. `areasFor` is called once and its result is handed to both,
 * so the two cannot disagree about what this account may see.
 *
 * There is no page container. Width belongs to the task, not to the shell, so
 * each screen chooses `read`, `content` or `wide` through the `Screen`
 * primitive — a lesson is not a mission workspace and neither is a course
 * overview.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const profile = await requireProfile();
  const user = await getUser();
  const areas = areasFor(profile.role);
  const account = <AccountBlock profile={profile} email={user?.email ?? null} />;

  const tabs = TAB_IDS.map((id) => areas.find((area) => area.id === id)).filter(
    (area): area is NonNullable<typeof area> => area !== undefined,
  );
  const overflow = areas.filter((area) => !TAB_IDS.includes(area.id));

  return (
    <div className="flex min-h-dvh">
      <SideRail areas={areas} account={account} />

      {/* `min-w-0`: a grid or flex child's default minimum width is its
          content, so without this a wide table inside a page pushes the whole
          document sideways. */}
      <main className="min-w-0 flex-1">{children}</main>

      <TabBar tabs={tabs} overflow={overflow} account={account} />
    </div>
  );
}
