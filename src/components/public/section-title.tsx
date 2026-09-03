/**
 * The heading above a section.
 *
 * Small, quiet, and level two — the creator's name is the page's `h1`, so
 * every section below it is a heading inside that document rather than a
 * competing title. A block with no title renders nothing at all, which is the
 * common case and should cost no space.
 *
 * Deliberately understated. The thing a visitor should notice is the content;
 * a section label that shouts turns a page into a form.
 */
export function SectionTitle({ children }: { children: string }) {
  const title = children.trim();
  if (title.length === 0) return null;

  return (
    <h2 className="mb-3 text-center text-[0.8125rem] font-medium tracking-[0.06em] text-ink-subtle uppercase">
      {title}
    </h2>
  );
}
