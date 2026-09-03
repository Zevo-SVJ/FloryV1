import { SectionTitle } from "@/components/public/section-title";
import { Icon } from "@/components/public/blocks/contact-icons";
import {
  contactDetail,
  contactHref,
  contactLabel,
  type ContactItem,
} from "@/lib/contact/actions";
import type { ContactBlockData } from "@/lib/blocks/schemas";

/**
 * How to reach this person.
 *
 * Four actions rather than four links, and the distinction is the reason this
 * block exists: `mailto:` and `tel:` hand an address or a number to the
 * operating system, which is a different thing from navigating to a page. The
 * `links` table is deliberately `http(s)` only — a button that silently opens
 * a mail composer is a surprise — so widening that column for this would have
 * put `tel:` behind every link on every page.
 *
 * Every `href` here is built by `lib/contact/actions.ts` from a value
 * validated for its own scheme. Nothing a creator typed reaches an attribute
 * unchecked, and an item whose value no longer validates renders as text
 * rather than as a dead button.
 *
 * An address with no link is exactly that: text with a marker beside it. It is
 * not turned into a search on somebody's map provider, because which map a
 * visitor uses is not ours to choose and constructing one would be a
 * third-party URL nobody asked for.
 *
 * `.sm-contact` takes the page's block surface, and the buttons take nothing
 * from `.sm-button` — a contact row is a list of details, and giving it the
 * same weight as the links a creator is actually pointing at would flatten the
 * page's hierarchy.
 */
export function ContactBlock({ data }: { data: ContactBlockData }) {
  const title = data.title.trim();

  return (
    <section aria-label={title.length > 0 ? title : "Contact"}>
      <SectionTitle>{data.title}</SectionTitle>

      <ul className="sm-contact sm-surface">
        {data.items.map((item) => (
          <li key={item.id}>
            <Row item={item} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function Row({ item }: { item: ContactItem }) {
  const href = contactHref(item);
  const label = contactLabel(item);
  const detail = contactDetail(item);

  const body = (
    <>
      <span className="sm-contact-mark" aria-hidden>
        <Icon kind={item.kind} />
      </span>
      <span className="sm-contact-text">
        <span className="sm-contact-label">{label}</span>
        <span className="sm-contact-detail">{detail}</span>
      </span>
    </>
  );

  if (!href) {
    return <span className="sm-contact-row">{body}</span>;
  }

  /*
   * `nofollow ugc` on the one action that is a web address, for the same
   * reason every link button carries it: a creator page must not be a way to
   * place a backlink. `mailto:` and `tel:` are not crawled, and the attribute
   * is harmless on them.
   */
  return (
    <a href={href} rel="nofollow ugc noopener" className="sm-contact-row">
      {body}
    </a>
  );
}
