import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/states/empty-state";
import { Badge } from "@/components/ui/surface";
import { groupOf, requireSection } from "@/lib/lock/navigation";

/**
 * A whole page for a section that is routed but not built.
 *
 * Most of LOCK is in this state today, and how it handles that is a product
 * decision rather than a placeholder detail. The alternative — invented
 * statistics, greyed-out cards, a chart of nothing — makes the product look
 * finished, and makes every later prompt harder because the next person has to
 * work out which parts were real.
 *
 * So the page is a real page: the same header every other page has, in the same
 * position, with the section's own words. What is missing is stated once,
 * calmly, along with which prompt supplies it. A section still rendering this
 * in production is a to-do item that cannot be overlooked.
 *
 * Everything comes from the navigation registry, so a section's description
 * exists in exactly one place — the sidebar tooltip and this page cannot drift.
 */
export function SectionPlaceholder({
  href,
  /** What will eventually live here. One sentence, in the section's language. */
  children,
}: {
  href: string;
  children?: React.ReactNode;
}) {
  const section = requireSection(href);
  const group = groupOf(href);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={group?.label}
        title={section.label}
        description={section.summary}
        meta={section.arrivesIn ? <Badge>{section.arrivesIn}</Badge> : null}
      />

      <EmptyState title="Nothing here yet">
        {children ?? (
          <p>
            This section is routed and reachable, and deliberately empty. It is
            filled in by {section.arrivesIn ?? "a later prompt"}.
          </p>
        )}
      </EmptyState>
    </div>
  );
}
