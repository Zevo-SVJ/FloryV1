/**
 * The heading above a section.
 *
 * Small, quiet, and level two — the creator's name is the page's `h1`, so
 * every section below it is a heading inside that document rather than a
 * competing title. A block with no title renders nothing at all, which is the
 * common case and should cost no space.
 *
 * Its size, colour, casing and alignment all come from the design: the same
 * component reads as a caps label under Minimal and as a left-aligned line
 * under Editorial, without either theme needing its own component.
 */
export function SectionTitle({ children }: { children: string }) {
  const title = children.trim();
  if (title.length === 0) return null;

  return <h2 className="sm-section-title">{title}</h2>;
}
