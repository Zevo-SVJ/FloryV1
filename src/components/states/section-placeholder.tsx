import { StateBlock } from "@/components/states/state-block";
import { Badge } from "@/components/ui/surface";
import type { Section } from "@/lib/lock/navigation";

/**
 * What a section renders before it is built.
 *
 * The alternative — a page of invented statistics and greyed-out cards — makes
 * the product look finished and makes every later prompt harder, because the
 * next person has to work out which parts were real. This states what the
 * section is for, and when it arrives. That is the whole content, and it is
 * honest.
 *
 * Each of these disappears as its prompt lands. A section still rendering this
 * in production is a to-do list item that cannot be missed.
 */
export function SectionPlaceholder({ section }: { section: Section }) {
  return (
    <StateBlock eyebrow="Not built yet" title={section.label} description={section.summary}>
      {section.arrivesIn ? <Badge>{section.arrivesIn}</Badge> : null}
    </StateBlock>
  );
}
