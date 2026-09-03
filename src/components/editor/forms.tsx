"use client";

import { useState } from "react";
import {
  ChoiceField,
  DateTimeField,
  Icon,
  ICONS,
  IconButton,
  ImagePicker,
  SelectField,
  TextAreaField,
  TextField,
  Toggle,
} from "@/components/editor/controls";
import { SocialIcon, socialLabel } from "@/components/public/social-icon";
import {
  newId,
  newLink,
  reorder,
  type DraftBlock,
  type DraftLink,
  type DraftSocial,
} from "@/lib/editor/state";
import { useNow } from "@/lib/editor/use-now";
import { useBrowserValue } from "@/lib/hooks/use-browser-value";
import {
  formatInstant,
  fromLocalInput,
  linkState,
  localZoneName,
  scheduleProblem,
  toLocalInput,
  type LinkState,
} from "@/lib/links/schedule";
import {
  CONTACT_KINDS,
  CONTACT_LABELS,
  CONTACT_PLACEHOLDERS,
  contactItemSchema,
  type ContactItem,
  type ContactKind,
} from "@/lib/contact/actions";
import { cn } from "@/lib/utils/cn";
import { SOCIAL_PLATFORMS } from "@/lib/validation/schemas";
import {
  checkSocialUrl,
  checkUrl,
  emailFromMailto,
  isEmailAddress,
  normalizeSocialUrl,
  normalizeUrl,
} from "@/lib/validation/url";
import {
  EMBED_PROVIDERS,
  VIDEO_PROVIDERS,
  providerExamples,
  resolveEmbed,
  unsupportedMessage,
  type EmbedProvider,
} from "@/lib/embeds/providers";
import type {
  ContactBlockData,
  DividerBlockData,
  EmbedBlockData,
  GalleryBlockData,
  GalleryItem,
  HeadingBlockData,
  ImageBlockData,
  LinksBlockData,
  SpacerBlockData,
  TextBlockData,
  VideoBlockData,
} from "@/lib/blocks/schemas";
import type { SocialPlatform } from "@/types/database";

/**
 * One form per block type, and the lookup that chooses between them.
 *
 * The second half of the registry: `lib/blocks/registry.ts` holds what is true
 * about a type regardless of who is asking, and this holds how a person edits
 * one. They are apart because the registry is imported by the public renderer,
 * and a React component in it would put every editor form inside the public
 * page's import graph.
 *
 * Both key off `BlockType`, so a type added to one and forgotten in the other
 * is a compile error rather than a blank panel.
 *
 * The forms deliberately do not validate on every keystroke. Somebody halfway
 * through typing a URL has not made a mistake yet, and a field that turns red
 * on the second character is a field people learn to ignore. Validation
 * happens when a field is left, and again — authoritatively — on save.
 */

export interface BlockFormProps {
  block: DraftBlock;
  update: (patch: Partial<DraftBlock>) => void;
  /** Page-level, because the database holds one row per platform per creator. */
  socials: DraftSocial[];
  setSocials: (socials: DraftSocial[]) => void;
}

export function BlockForm(props: BlockFormProps) {
  switch (props.block.type) {
    case "links":
      return <LinksForm {...props} />;
    case "socials":
      return <SocialsForm {...props} />;
    case "text":
      return <TextForm {...props} />;
    case "heading":
      return <HeadingForm {...props} />;
    case "image":
      return <ImageForm {...props} />;
    case "image_gallery":
      return <GalleryForm {...props} />;
    case "video":
      return <EmbedForm {...props} allowed={VIDEO_PROVIDERS} noun="video" />;
    case "embed":
      return <EmbedForm {...props} allowed={EMBED_PROVIDERS} noun="track, album or playlist" />;
    case "contact":
      return <ContactForm {...props} />;
    case "divider":
      return <DividerForm {...props} />;
    case "spacer":
      return <SpacerForm {...props} />;
  }
}

/* ── Links ────────────────────────────────────────────────────────────────── */

function LinksForm({ block, update }: BlockFormProps) {
  const data = block.data as LinksBlockData;

  const setLinks = (links: DraftLink[]) => update({ links });
  const patch = (id: string, next: Partial<DraftLink>) =>
    setLinks(block.links.map((link) => (link.id === id ? { ...link, ...next } : link)));

  return (
    <div className="space-y-4">
      <TextField
        label="Section title"
        value={data.title}
        onChange={(title) => update({ data: { ...data, title } })}
        placeholder="Optional — “Latest”, “Shop”"
        maxLength={60}
      />

      {/*
        * A grid is a layout of this section, not a different kind of section.
        * The links keep their ids, so switching does not restart a single
        * link's click history — which a second "link grid" block type would
        * have done, silently, the first time somebody tried it.
        */}
      <ChoiceField
        label="Layout"
        value={data.layout}
        onChange={(layout) => update({ data: { ...data, layout } })}
        options={[
          { value: "list", label: "Stacked" },
          { value: "grid", label: "Grid" },
        ]}
      />

      <div className="space-y-2">
        {block.links.map((link, index) => (
          <LinkRow
            key={link.id}
            link={link}
            first={index === 0}
            last={index === block.links.length - 1}
            onChange={(next) => patch(link.id, next)}
            onMove={(delta) => setLinks(reorder(block.links, index, index + delta))}
            onRemove={() => setLinks(block.links.filter((item) => item.id !== link.id))}
          />
        ))}

        {block.links.length === 0 ? (
          <p className="rounded-card bg-surface-sunken px-3 py-3 text-[0.8125rem] text-ink-subtle">
            No links in this section yet.
          </p>
        ) : null}
      </div>

      <AddRow label="Add link" onClick={() => setLinks([...block.links, newLink()])} />
    </div>
  );
}

/* ── A link's state, as a badge ───────────────────────────────────────────── */

const STATE_LABELS: Record<LinkState, string> = {
  live: "Live",
  hidden: "Hidden",
  scheduled: "Scheduled",
  expired: "Expired",
};

const STATE_STYLES: Record<LinkState, string> = {
  live: "bg-success/12 text-success",
  hidden: "bg-surface text-ink-subtle ring-1 ring-border",
  scheduled: "bg-accent/12 text-accent",
  expired: "bg-surface text-ink-muted ring-1 ring-border",
};

/**
 * Why this link is, or is not, on the page.
 *
 * The single most useful thing this whole feature adds. A link that has been
 * scheduled, expired or switched off is absent from the public page for three
 * different reasons, and a creator looking at a list of links they can see in
 * the editor and cannot see on their page needs to be told which — not left
 * to work it out from two date fields.
 *
 * `now` is null until the component has mounted, and the badge falls back to
 * the two answers that do not depend on the clock. That is what keeps the
 * server's render and the browser's first render identical.
 */
function StateBadge({ link, now }: { link: DraftLink; now: Date | null }) {
  const state: LinkState = now
    ? linkState(link, now)
    : link.isActive
      ? "live"
      : "hidden";

  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <span
        className={cn(
          "inline-flex h-5 items-center rounded-full px-2 text-[0.6875rem] font-medium",
          STATE_STYLES[state],
        )}
      >
        {STATE_LABELS[state]}
      </span>

      {link.isFeatured ? (
        <span className="inline-flex h-5 items-center rounded-full bg-ink/8 px-2 text-[0.6875rem] font-medium text-ink-muted">
          Featured
        </span>
      ) : null}
    </span>
  );
}

/** "from 10 Sep, 18:00", "until 15 Sep, 23:59", or nothing. */
function scheduleSummary(link: DraftLink): string | null {
  const from = link.startsAt ? formatInstant(link.startsAt) : null;
  const until = link.endsAt ? formatInstant(link.endsAt) : null;

  if (from && until) return `${from} → ${until}`;
  if (from) return `From ${from}`;
  if (until) return `Until ${until}`;
  return null;
}

/**
 * One link, and everything that decides when it appears.
 *
 * Two fields are always visible — a title and an address — and everything
 * else is behind "Options". That split is the whole design of this row: the
 * common case is a creator adding a link, and a card that met them with a
 * featured switch, an icon picker and two date fields would make the common
 * case worse to serve the rare one.
 *
 * The badge is not behind the disclosure, because it answers the question a
 * creator actually arrives with: this link is in my editor and not on my page,
 * why. A schedule summary sits beside it when there is one, so a collapsed row
 * still says "Until 15 Sep, 23:59" without being opened.
 */
function LinkRow({
  link,
  first,
  last,
  onChange,
  onMove,
  onRemove,
}: {
  link: DraftLink;
  first: boolean;
  last: boolean;
  onChange: (next: Partial<DraftLink>) => void;
  onMove: (delta: 1 | -1) => void;
  onRemove: () => void;
}) {
  const [urlError, setUrlError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const now = useNow();

  /**
   * Checked when the field is left, not while it is being typed.
   *
   * `normalizeUrl` is applied at the same moment, so somebody who pasted
   * `instagram.com/name` sees it become a real URL rather than being told off
   * for the scheme they left out.
   */
  function settleUrl() {
    const trimmed = link.url.trim();
    if (trimmed.length === 0) {
      setUrlError(null);
      return;
    }
    const normalized = normalizeUrl(trimmed);
    if (normalized !== link.url) onChange({ url: normalized });
    setUrlError(checkUrl(normalized) ? "That does not look like a valid link." : null);
  }

  const summary = scheduleSummary(link);
  const problem = scheduleProblem(link);

  return (
    <div className="rounded-card bg-surface-sunken p-2.5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <StateBadge link={link} now={now} />
        {summary ? (
          <span className="truncate text-[0.6875rem] text-ink-subtle">{summary}</span>
        ) : null}
      </div>

      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1 space-y-2">
          <input
            value={link.title}
            onChange={(event) => onChange({ title: event.target.value })}
            placeholder="Title"
            maxLength={80}
            aria-label="Link title"
            className="h-9 w-full rounded-control bg-surface px-2.5 text-sm ring-1 ring-border focus:ring-2 focus:ring-accent focus:outline-none"
          />
          <input
            value={link.url}
            onChange={(event) => onChange({ url: event.target.value })}
            onBlur={settleUrl}
            placeholder="https://"
            inputMode="url"
            aria-label="Link address"
            aria-invalid={urlError ? true : undefined}
            className="h-9 w-full rounded-control bg-surface px-2.5 font-mono text-[0.8125rem] ring-1 ring-border focus:ring-2 focus:ring-accent focus:outline-none aria-invalid:ring-danger"
          />
        </div>

        <div className="flex flex-col items-center">
          <IconButton label="Move link up" onClick={() => onMove(-1)} disabled={first}>
            <Icon d={ICONS.up} className="h-3.5 w-3.5" />
          </IconButton>
          <IconButton label="Move link down" onClick={() => onMove(1)} disabled={last}>
            <Icon d={ICONS.down} className="h-3.5 w-3.5" />
          </IconButton>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 pl-0.5">
        <Toggle
          checked={link.isActive}
          onChange={(isActive) => onChange({ isActive })}
          label={`Show “${link.title || "this link"}” on the page`}
        />

        <span className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            aria-expanded={open}
            className="flex h-8 items-center gap-1 rounded-control px-2 text-[0.75rem] font-medium text-ink-muted transition-colors hover:bg-surface hover:text-ink"
          >
            Options
            <Icon
              d={ICONS.chevron}
              className={cn("h-3 w-3 transition-transform", open && "rotate-180")}
            />
          </button>
          <IconButton label="Delete link" onClick={onRemove} danger>
            <Icon d={ICONS.trash} className="h-3.5 w-3.5" />
          </IconButton>
        </span>
      </div>

      {urlError ? (
        <p role="alert" className="mt-1.5 text-[0.8125rem] text-danger">
          {urlError}
        </p>
      ) : null}

      {open ? (
        <div className="mt-3 space-y-4 border-t border-border pt-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[0.8125rem] font-medium text-ink">Feature this link</span>
            <Toggle
              checked={link.isFeatured}
              onChange={(isFeatured) => onChange({ isFeatured })}
              label="Give this link more weight on the page"
            />
          </div>
          <p className="-mt-3 text-[0.75rem] text-ink-subtle">
            Taller, heavier, and ringed in your accent colour. In a grid it takes
            the full row.
          </p>

          <LinkIconPicker link={link} onChange={onChange} />
          <LinkSchedule link={link} onChange={onChange} problem={problem} />
        </div>
      ) : null}

      {/*
        * Shown whether or not the options are open. A backwards window is the
        * one mistake here that makes a link invisible forever, and it is
        * refused by the database — so a creator must not be able to leave it
        * behind a collapsed disclosure and press Save.
        */}
      {problem && !open ? (
        <p role="alert" className="mt-1.5 text-[0.8125rem] text-danger">
          {problem}
        </p>
      ) : null}
    </div>
  );
}

/**
 * A link's icon: a platform mark, an uploaded image, or none.
 *
 * Three options and no fourth. The absent fourth is "fetch the site's
 * favicon", which sounds free and is not: it would mean this server making a
 * request to whatever address a creator typed, which is a server-side request
 * forgery with a friendly name. The platform marks cover the cases that
 * actually come up — a creator's links are mostly to platforms we already draw
 * — and an upload covers the rest.
 *
 * Setting one clears the other, here as well as in the schema and in the
 * database, because "both" has no rendering.
 */
function LinkIconPicker({
  link,
  onChange,
}: {
  link: DraftLink;
  onChange: (next: Partial<DraftLink>) => void;
}) {
  const mode = link.iconUrl ? "upload" : link.iconPlatform ? "platform" : "none";

  return (
    <div className="space-y-2">
      <ChoiceField
        label="Icon"
        value={mode}
        onChange={(next) => {
          if (next === "none") onChange({ iconPlatform: null, iconUrl: null });
          if (next === "platform") onChange({ iconPlatform: "website", iconUrl: null });
          if (next === "upload") onChange({ iconPlatform: null, iconUrl: null });
        }}
        options={[
          { value: "none", label: "None" },
          { value: "platform", label: "Platform" },
          { value: "upload", label: "Upload" },
        ]}
      />

      {mode === "platform" ? (
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-surface text-ink-muted ring-1 ring-border">
            <SocialIcon platform={link.iconPlatform ?? "website"} className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <SelectField
              label="Mark"
              value={link.iconPlatform ?? "website"}
              onChange={(iconPlatform) => onChange({ iconPlatform, iconUrl: null })}
              options={SOCIAL_PLATFORMS.map((platform) => ({
                value: platform,
                label: socialLabel(platform),
              }))}
            />
          </div>
        </div>
      ) : null}

      {mode === "upload" || link.iconUrl ? (
        <ImagePicker
          label="icon"
          shape="square"
          url={link.iconUrl}
          onChange={(iconUrl) => onChange({ iconUrl, iconPlatform: null })}
        />
      ) : null}
    </div>
  );
}

/**
 * When a link starts and when it stops.
 *
 * Both optional and independent: a launch with no end, an offer with no
 * announcement, or a window with both. The times are the creator's own —
 * entered and read in their device's zone, stored as absolute instants — and
 * the zone is printed under the fields rather than assumed, because a number
 * on screen with no zone beside it is the ambiguity this whole design exists
 * to avoid.
 *
 * The note about the cache is there because it is true and a creator would
 * otherwise think the feature was broken: the public page is cached for a
 * minute, so a link can appear up to a minute after its start.
 */
function LinkSchedule({
  link,
  onChange,
  problem,
}: {
  link: DraftLink;
  onChange: (next: Partial<DraftLink>) => void;
  problem: string | null;
}) {
  /*
   * The zone name is a browser fact, not a render-time one. `Intl` resolves to
   * the server's zone when this component is server-rendered, and printing one
   * zone's name over another zone's numbers is worse than printing nothing for
   * a tick.
   */
  const zone = useBrowserValue(localZoneName, "your device's time zone");

  return (
    <div className="space-y-3">
      <DateTimeField
        label="Starts"
        value={toLocalInput(link.startsAt)}
        onChange={(value) => onChange({ startsAt: fromLocalInput(value) })}
        hint="Leave blank to show it straight away."
      />

      <DateTimeField
        label="Ends"
        value={toLocalInput(link.endsAt)}
        onChange={(value) => onChange({ endsAt: fromLocalInput(value) })}
        min={toLocalInput(link.startsAt) || undefined}
        error={problem}
        hint="Leave blank for no end. The link disappears at this time."
      />

      <p className="text-[0.75rem] leading-relaxed text-ink-subtle">
        Times are in {zone}. Your page is cached for a minute, so a scheduled
        link can appear up to a minute late.
      </p>
    </div>
  );
}

/* ── Socials ──────────────────────────────────────────────────────────────── */

/**
 * The row of platforms.
 *
 * Only platforms the creator has not already added are offered, because the
 * database enforces one row per platform and a second Instagram would fail the
 * save rather than the form. Email is asked for as an address and stored as a
 * `mailto:` — nobody types the scheme, and the column requires a URL.
 */
function SocialsForm({ socials, setSocials }: BlockFormProps) {
  const used = new Set(socials.map((social) => social.platform));
  const available = SOCIAL_PLATFORMS.filter((platform) => !used.has(platform));

  const patch = (id: string, next: Partial<DraftSocial>) =>
    setSocials(socials.map((social) => (social.id === id ? { ...social, ...next } : social)));

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {socials.map((social, index) => (
          <SocialRow
            key={social.id}
            social={social}
            used={used}
            first={index === 0}
            last={index === socials.length - 1}
            onChange={(next) => patch(social.id, next)}
            onMove={(delta) => setSocials(reorder(socials, index, index + delta))}
            onRemove={() => setSocials(socials.filter((item) => item.id !== social.id))}
          />
        ))}

        {socials.length === 0 ? (
          <p className="rounded-card bg-surface-sunken px-3 py-3 text-[0.8125rem] text-ink-subtle">
            No profiles added yet.
          </p>
        ) : null}
      </div>

      {available[0] ? (
        <AddRow
          label="Add profile"
          onClick={() =>
            setSocials([
              ...socials,
              { id: newId(), platform: available[0] as SocialPlatform, url: "", isActive: true },
            ])
          }
        />
      ) : (
        <p className="text-[0.8125rem] text-ink-subtle">Every platform has been added.</p>
      )}
    </div>
  );
}

function SocialRow({
  social,
  used,
  first,
  last,
  onChange,
  onMove,
  onRemove,
}: {
  social: DraftSocial;
  used: Set<SocialPlatform>;
  first: boolean;
  last: boolean;
  onChange: (next: Partial<DraftSocial>) => void;
  onMove: (delta: 1 | -1) => void;
  onRemove: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const isEmail = social.platform === "email";

  /*
   * An email row asks for an address and stores a `mailto:`. Nobody types the
   * scheme, and showing it back would invite somebody to edit it into
   * something the constraint refuses — so the field holds the address and the
   * conversion happens on both edges.
   */
  const shown = isEmail ? emailFromMailto(social.url) : social.url;

  function settle() {
    const value = shown.trim();
    if (value.length === 0) {
      setError(null);
      return;
    }

    if (isEmail) {
      if (!isEmailAddress(value)) {
        setError("Enter an email address.");
        return;
      }
      setError(null);
      onChange({ url: `mailto:${value}` });
      return;
    }

    const normalized = normalizeSocialUrl(value);
    if (normalized !== social.url) onChange({ url: normalized });
    setError(checkSocialUrl(normalized) ? "That does not look like a valid link." : null);
  }

  return (
    <div className="rounded-card bg-surface-sunken p-2.5">
      <div className="flex items-start gap-2">
        <span className="mt-2 flex h-6 w-6 shrink-0 items-center justify-center text-ink-muted">
          <SocialIcon platform={social.platform} className="h-4 w-4" />
        </span>

        <div className="min-w-0 flex-1 space-y-2">
          <select
            value={social.platform}
            onChange={(event) =>
              onChange({ platform: event.target.value as SocialPlatform, url: "" })
            }
            aria-label="Platform"
            className="h-9 w-full cursor-pointer rounded-control bg-surface px-2.5 text-sm ring-1 ring-border focus:ring-2 focus:ring-accent focus:outline-none"
          >
            {SOCIAL_PLATFORMS.map((platform) => (
              <option
                key={platform}
                value={platform}
                disabled={platform !== social.platform && used.has(platform)}
              >
                {socialLabel(platform)}
              </option>
            ))}
          </select>

          <input
            value={shown}
            onChange={(event) => onChange({ url: event.target.value })}
            onBlur={settle}
            placeholder={isEmail ? "you@example.com" : "https://"}
            inputMode={isEmail ? "email" : "url"}
            aria-label={`${socialLabel(social.platform)} address`}
            aria-invalid={error ? true : undefined}
            className="h-9 w-full rounded-control bg-surface px-2.5 font-mono text-[0.8125rem] ring-1 ring-border focus:ring-2 focus:ring-accent focus:outline-none aria-invalid:ring-danger"
          />
        </div>

        <div className="flex flex-col items-center">
          <IconButton label="Move profile up" onClick={() => onMove(-1)} disabled={first}>
            <Icon d={ICONS.up} className="h-3.5 w-3.5" />
          </IconButton>
          <IconButton label="Move profile down" onClick={() => onMove(1)} disabled={last}>
            <Icon d={ICONS.down} className="h-3.5 w-3.5" />
          </IconButton>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <Toggle
          checked={social.isActive}
          onChange={(isActive) => onChange({ isActive })}
          label={`Show ${socialLabel(social.platform)} on the page`}
        />
        <IconButton label="Delete profile" onClick={onRemove} danger>
          <Icon d={ICONS.trash} className="h-3.5 w-3.5" />
        </IconButton>
      </div>

      {error ? (
        <p role="alert" className="mt-1.5 text-[0.8125rem] text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/* ── Text ─────────────────────────────────────────────────────────────────── */

function TextForm({ block, update }: BlockFormProps) {
  const data = block.data as TextBlockData;
  const set = (next: Partial<TextBlockData>) => update({ data: { ...data, ...next } });

  return (
    <div className="space-y-4">
      <TextAreaField
        label="Text"
        value={data.text}
        onChange={(text) => set({ text })}
        placeholder="An announcement, a heading, or a line of context."
        maxLength={1000}
        counter
        rows={4}
      />
      <div className="flex flex-wrap gap-5">
        <ChoiceField
          label="Style"
          value={data.style}
          onChange={(style) => set({ style })}
          options={[
            { value: "body", label: "Paragraph" },
            { value: "heading", label: "Heading" },
          ]}
        />
        <ChoiceField
          label="Alignment"
          value={data.align}
          onChange={(align) => set({ align })}
          options={[
            { value: "center", label: "Centred" },
            { value: "left", label: "Left" },
          ]}
        />
      </div>
    </div>
  );
}

/* ── Image ────────────────────────────────────────────────────────────────── */

function ImageForm({ block, update }: BlockFormProps) {
  const data = block.data as ImageBlockData;
  const set = (next: Partial<ImageBlockData>) => update({ data: { ...data, ...next } });

  return (
    <div className="space-y-4">
      <ImagePicker
        label="image"
        url={data.url.length > 0 ? data.url : null}
        onChange={(url) => set({ url: url ?? "" })}
      />

      <TextField
        label="Alt text"
        value={data.alt}
        onChange={(alt) => set({ alt })}
        placeholder="What is in the picture?"
        maxLength={200}
        hint="Read aloud to people using a screen reader. Leave blank if the image is decoration."
      />

      <TextField
        label="Link to"
        value={data.href ?? ""}
        onChange={(href) => set({ href: href.length > 0 ? href : null })}
        onBlurValidate={(value) => {
          if (value.length === 0) {
            set({ href: null });
            return null;
          }
          const normalized = normalizeUrl(value);
          set({ href: normalized });
          return checkUrl(normalized) ? "That does not look like a valid link." : null;
        }}
        placeholder="Optional — makes the image clickable"
        hint="Turns the image into a button. Useful for a drop, a video, or a shop."
      />

      <ChoiceField
        label="Shape"
        value={data.aspect}
        onChange={(aspect) => set({ aspect })}
        options={[
          { value: "auto", label: "Original" },
          { value: "square", label: "Square" },
          { value: "portrait", label: "Portrait" },
          { value: "wide", label: "Wide" },
        ]}
      />
    </div>
  );
}

/* ── Gallery ──────────────────────────────────────────────────────────────── */

function GalleryForm({ block, update }: BlockFormProps) {
  const data = block.data as GalleryBlockData;
  const set = (next: Partial<GalleryBlockData>) => update({ data: { ...data, ...next } });

  const setItems = (items: GalleryItem[]) => set({ items });
  const patch = (id: string, next: Partial<GalleryItem>) =>
    setItems(data.items.map((item) => (item.id === id ? { ...item, ...next } : item)));

  return (
    <div className="space-y-4">
      <TextField
        label="Section title"
        value={data.title}
        onChange={(title) => set({ title })}
        placeholder="Optional — “Recent work”"
        maxLength={60}
      />

      <ChoiceField
        label="Layout"
        value={data.layout}
        onChange={(layout) => set({ layout })}
        options={[
          { value: "carousel", label: "Swipe" },
          { value: "grid", label: "Grid" },
        ]}
      />

      <div className="space-y-2">
        {data.items.map((item, index) => (
          <div key={item.id} className="rounded-card bg-surface-sunken p-2.5">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1 space-y-2">
                <ImagePicker
                  label="image"
                  shape="square"
                  url={item.url.length > 0 ? item.url : null}
                  onChange={(url) => patch(item.id, { url: url ?? "" })}
                />
                <input
                  value={item.caption}
                  onChange={(event) => patch(item.id, { caption: event.target.value })}
                  placeholder="Caption (optional)"
                  maxLength={120}
                  aria-label="Caption"
                  className="h-9 w-full rounded-control bg-surface px-2.5 text-sm ring-1 ring-border focus:ring-2 focus:ring-accent focus:outline-none"
                />
                <input
                  value={item.alt}
                  onChange={(event) => patch(item.id, { alt: event.target.value })}
                  placeholder="Alt text (optional)"
                  maxLength={200}
                  aria-label="Alt text"
                  className="h-9 w-full rounded-control bg-surface px-2.5 text-sm ring-1 ring-border focus:ring-2 focus:ring-accent focus:outline-none"
                />
                {/*
                  * A destination per image. Not tracked, and the hint says so
                  * rather than leaving a creator to discover it from an
                  * analytics page that never mentions the gallery.
                  */}
                <input
                  value={item.href ?? ""}
                  onChange={(event) =>
                    patch(item.id, {
                      href: event.target.value.length > 0 ? event.target.value : null,
                    })
                  }
                  onBlur={(event) => {
                    const value = event.target.value.trim();
                    patch(item.id, { href: value.length > 0 ? normalizeUrl(value) : null });
                  }}
                  placeholder="Links to (optional)"
                  inputMode="url"
                  aria-label="Image link"
                  className="h-9 w-full rounded-control bg-surface px-2.5 font-mono text-[0.8125rem] ring-1 ring-border focus:ring-2 focus:ring-accent focus:outline-none"
                />
              </div>

              <div className="flex flex-col items-center">
                <IconButton
                  label="Move image up"
                  onClick={() => setItems(reorder(data.items, index, index - 1))}
                  disabled={index === 0}
                >
                  <Icon d={ICONS.up} className="h-3.5 w-3.5" />
                </IconButton>
                <IconButton
                  label="Move image down"
                  onClick={() => setItems(reorder(data.items, index, index + 1))}
                  disabled={index === data.items.length - 1}
                >
                  <Icon d={ICONS.down} className="h-3.5 w-3.5" />
                </IconButton>
                <IconButton
                  label="Remove image"
                  danger
                  onClick={() => setItems(data.items.filter((entry) => entry.id !== item.id))}
                >
                  <Icon d={ICONS.trash} className="h-3.5 w-3.5" />
                </IconButton>
              </div>
            </div>
          </div>
        ))}

        {data.items.length === 0 ? (
          <p className="rounded-card bg-surface-sunken px-3 py-3 text-[0.8125rem] text-ink-subtle">
            No images yet. A gallery needs at least one to appear on your page.
          </p>
        ) : null}
      </div>

      {data.items.length < 24 ? (
        <AddRow
          label="Add image"
          onClick={() =>
            setItems([...data.items, { id: newId(), url: "", alt: "", caption: "", href: null }])
          }
        />
      ) : (
        <p className="text-[0.8125rem] text-ink-subtle">That is the most a gallery can hold.</p>
      )}

      <ChoiceField
        label="Shape"
        value={data.aspect}
        onChange={(aspect) => set({ aspect })}
        options={[
          { value: "portrait", label: "Portrait" },
          { value: "square", label: "Square" },
          { value: "wide", label: "Wide" },
        ]}
      />

      <GalleryCta cta={data.cta} onChange={(cta) => set({ cta })} />
    </div>
  );
}

function GalleryCta({
  cta,
  onChange,
}: {
  cta: GalleryBlockData["cta"];
  onChange: (cta: GalleryBlockData["cta"]) => void;
}) {
  const [error, setError] = useState<string | null>(null);

  if (!cta) {
    return (
      <AddRow label="Add a button" onClick={() => onChange({ label: "", url: "" })} />
    );
  }

  return (
    <div className="space-y-2 rounded-card bg-surface-sunken p-2.5">
      <div className="flex items-center justify-between">
        <p className="text-[0.8125rem] font-medium text-ink">Button</p>
        <IconButton label="Remove button" danger onClick={() => onChange(null)}>
          <Icon d={ICONS.trash} className="h-3.5 w-3.5" />
        </IconButton>
      </div>

      <input
        value={cta.label}
        onChange={(event) => onChange({ ...cta, label: event.target.value })}
        placeholder="View the collection"
        maxLength={40}
        aria-label="Button label"
        className="h-9 w-full rounded-control bg-surface px-2.5 text-sm ring-1 ring-border focus:ring-2 focus:ring-accent focus:outline-none"
      />
      <input
        value={cta.url}
        onChange={(event) => onChange({ ...cta, url: event.target.value })}
        onBlur={() => {
          const value = cta.url.trim();
          if (value.length === 0) {
            setError(null);
            return;
          }
          const normalized = normalizeUrl(value);
          onChange({ ...cta, url: normalized });
          setError(checkUrl(normalized) ? "That does not look like a valid link." : null);
        }}
        placeholder="https://"
        inputMode="url"
        aria-label="Button address"
        aria-invalid={error ? true : undefined}
        className="h-9 w-full rounded-control bg-surface px-2.5 font-mono text-[0.8125rem] ring-1 ring-border focus:ring-2 focus:ring-accent focus:outline-none aria-invalid:ring-danger"
      />
      {error ? (
        <p role="alert" className="text-[0.8125rem] text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/* ── Video and Spotify ────────────────────────────────────────────────────── */

/**
 * One form for both, because the difference between them is a list of
 * providers rather than a different interaction.
 *
 * The URL is checked against the provider list the moment the field is left,
 * so an unsupported link is refused here — in front of the person who pasted
 * it — rather than silently disappearing from the published page.
 */
function EmbedForm({
  block,
  update,
  allowed,
  noun,
}: BlockFormProps & { allowed: readonly EmbedProvider[]; noun: string }) {
  const data = block.data as VideoBlockData | EmbedBlockData;
  const set = (next: Partial<VideoBlockData>) => update({ data: { ...data, ...next } });

  const resolved = data.url.trim().length > 0 ? resolveEmbed(data.url, allowed) : null;

  return (
    <div className="space-y-4">
      <TextField
        label="Link"
        value={data.url}
        onChange={(url) => set({ url })}
        onBlurValidate={(value) => {
          if (value.length === 0) return null;
          return resolveEmbed(value, allowed) ? null : unsupportedMessage(allowed);
        }}
        placeholder={providerExamples(allowed)[0]}
        hint={`Paste the ${noun} link. ${providerExamples(allowed).join("  ·  ")}`}
      />

      {resolved ? (
        <p className="text-[0.8125rem] text-success">
          Recognised — this will play on your page.
        </p>
      ) : null}

      <TextField
        label="Title"
        value={data.title}
        onChange={(title) => set({ title })}
        placeholder="Optional heading above the player"
        maxLength={60}
      />
    </div>
  );
}

/* ── Heading ──────────────────────────────────────────────────────────────── */

/**
 * A real heading.
 *
 * The level is offered as "Section" and "Subsection" rather than as `h2` and
 * `h3`, because the creator's question is about a page and not about HTML —
 * and because there is no third option to offer. The page's `h1` is the
 * creator's name, and a block that could emit another one would be a block
 * that gives a page two titles.
 */
function HeadingForm({ block, update }: BlockFormProps) {
  const data = block.data as HeadingBlockData;
  const set = (next: Partial<HeadingBlockData>) => update({ data: { ...data, ...next } });

  return (
    <div className="space-y-4">
      <TextField
        label="Heading"
        value={data.text}
        onChange={(text) => set({ text })}
        placeholder="My content"
        maxLength={80}
      />

      <div className="flex flex-wrap gap-5">
        <ChoiceField
          label="Level"
          value={data.level}
          onChange={(level) => set({ level })}
          options={[
            { value: "section", label: "Section" },
            { value: "subsection", label: "Subsection" },
          ]}
        />
        <ChoiceField
          label="Alignment"
          value={data.align}
          onChange={(align) => set({ align })}
          options={[
            { value: "center", label: "Centred" },
            { value: "left", label: "Left" },
            { value: "right", label: "Right" },
          ]}
        />
      </div>

      <p className="text-[0.75rem] leading-relaxed text-ink-subtle">
        Unlike a Text block styled as a heading, this one is a real heading in
        the page&rsquo;s outline — which is how screen readers and search
        engines find their way around it.
      </p>
    </div>
  );
}

/* ── Divider and spacer ───────────────────────────────────────────────────── */

function DividerForm({ block, update }: BlockFormProps) {
  const data = block.data as DividerBlockData;

  return (
    <ChoiceField
      label="Style"
      value={data.style}
      onChange={(style) => update({ data: { ...data, style } })}
      options={[
        { value: "line", label: "Line" },
        { value: "subtle", label: "Subtle" },
        { value: "space", label: "Just space" },
      ]}
    />
  );
}

function SpacerForm({ block, update }: BlockFormProps) {
  const data = block.data as SpacerBlockData;

  return (
    <div className="space-y-2">
      <ChoiceField
        label="Size"
        value={data.size}
        onChange={(size) => update({ data: { ...data, size } })}
        options={[
          { value: "small", label: "Small" },
          { value: "medium", label: "Medium" },
          { value: "large", label: "Large" },
        ]}
      />
      <p className="text-[0.75rem] text-ink-subtle">
        Scaled to your page&rsquo;s spacing, so it stays in proportion if you
        change the layout.
      </p>
    </div>
  );
}

/* ── Contact ──────────────────────────────────────────────────────────────── */

/**
 * Ways to be reached.
 *
 * Each row is a kind and a value, and the value is validated for its kind
 * when the field is left — an email against the address pattern, a phone
 * against digits, a WhatsApp number against digits *with* a country code,
 * because `wa.me` resolves a national number to somebody else's phone.
 *
 * Changing a row's kind clears its value. An email address is not a phone
 * number, and carrying one into the other field would leave a row that fails
 * validation for a reason the creator did not cause.
 */
function ContactForm({ block, update }: BlockFormProps) {
  const data = block.data as ContactBlockData;
  const set = (next: Partial<ContactBlockData>) => update({ data: { ...data, ...next } });

  const setItems = (items: ContactItem[]) => set({ items });
  const patch = (id: string, next: Partial<ContactItem>) =>
    setItems(
      data.items.map((item) =>
        item.id === id ? ({ ...item, ...next } as ContactItem) : item,
      ),
    );

  return (
    <div className="space-y-4">
      <TextField
        label="Section title"
        value={data.title}
        onChange={(title) => set({ title })}
        placeholder="Optional — “Get in touch”"
        maxLength={60}
      />

      <div className="space-y-2">
        {data.items.map((item, index) => (
          <ContactRow
            key={item.id}
            item={item}
            first={index === 0}
            last={index === data.items.length - 1}
            onChange={(next) => patch(item.id, next)}
            onMove={(delta) => setItems(reorder(data.items, index, index + delta))}
            onRemove={() => setItems(data.items.filter((entry) => entry.id !== item.id))}
          />
        ))}

        {data.items.length === 0 ? (
          <p className="rounded-card bg-surface-sunken px-3 py-3 text-[0.8125rem] text-ink-subtle">
            No contact details yet.
          </p>
        ) : null}
      </div>

      {data.items.length < 6 ? (
        <AddRow
          label="Add a way to reach you"
          onClick={() =>
            setItems([...data.items, { id: newId(), kind: "email", label: "", value: "" }])
          }
        />
      ) : (
        <p className="text-[0.8125rem] text-ink-subtle">That is enough ways to be reached.</p>
      )}
    </div>
  );
}

function ContactRow({
  item,
  first,
  last,
  onChange,
  onMove,
  onRemove,
}: {
  item: ContactItem;
  first: boolean;
  last: boolean;
  onChange: (next: Partial<ContactItem>) => void;
  onMove: (delta: 1 | -1) => void;
  onRemove: () => void;
}) {
  const [error, setError] = useState<string | null>(null);

  /**
   * Validated against the item's own kind, by the schema that will judge it
   * on save.
   *
   * Reusing `contactItemSchema` rather than restating the rules means the
   * message a creator reads here is the message the server would have given,
   * and there is no second copy of "what counts as a phone number" to drift.
   */
  function settle() {
    if (item.value.trim().length === 0) {
      setError(null);
      return;
    }
    const parsed = contactItemSchema.safeParse(item);
    setError(parsed.success ? null : (parsed.error.issues[0]?.message ?? null));
  }

  return (
    <div className="rounded-card bg-surface-sunken p-2.5">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1 space-y-2">
          <select
            value={item.kind}
            onChange={(event) => {
              setError(null);
              /*
               * A fresh row of the new kind, keeping only the id. An address
               * item carries a `url` the other kinds have no field for, so
               * spreading the old item across would leave a stray key that
               * the discriminated union does not allow.
               */
              onChange({
                kind: event.target.value as ContactKind,
                value: "",
                label: "",
              } as Partial<ContactItem>);
            }}
            aria-label="Kind"
            className="h-9 w-full cursor-pointer rounded-control bg-surface px-2.5 text-sm ring-1 ring-border focus:ring-2 focus:ring-accent focus:outline-none"
          >
            {CONTACT_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {CONTACT_LABELS[kind]}
              </option>
            ))}
          </select>

          <input
            value={item.value}
            onChange={(event) => {
              if (error) setError(null);
              onChange({ value: event.target.value });
            }}
            onBlur={settle}
            placeholder={CONTACT_PLACEHOLDERS[item.kind]}
            inputMode={
              item.kind === "email" ? "email" : item.kind === "address" ? "text" : "tel"
            }
            aria-label={`${CONTACT_LABELS[item.kind]} value`}
            aria-invalid={error ? true : undefined}
            className="h-9 w-full rounded-control bg-surface px-2.5 text-sm ring-1 ring-border focus:ring-2 focus:ring-accent focus:outline-none aria-invalid:ring-danger"
          />

          <input
            value={item.label}
            onChange={(event) => onChange({ label: event.target.value })}
            placeholder={`Button label (default “${CONTACT_LABELS[item.kind]}”)`}
            maxLength={40}
            aria-label="Button label"
            className="h-9 w-full rounded-control bg-surface px-2.5 text-sm ring-1 ring-border focus:ring-2 focus:ring-accent focus:outline-none"
          />

          {/* An address can carry a link the creator chose. Only an address. */}
          {item.kind === "address" ? (
            <input
              value={item.url ?? ""}
              onChange={(event) =>
                onChange({
                  url: event.target.value.length > 0 ? event.target.value : null,
                } as Partial<ContactItem>)
              }
              onBlur={(event) => {
                const value = event.target.value.trim();
                onChange({
                  url: value.length > 0 ? normalizeUrl(value) : null,
                } as Partial<ContactItem>);
              }}
              placeholder="Map link (optional)"
              inputMode="url"
              aria-label="Map link"
              className="h-9 w-full rounded-control bg-surface px-2.5 font-mono text-[0.8125rem] ring-1 ring-border focus:ring-2 focus:ring-accent focus:outline-none"
            />
          ) : null}
        </div>

        <div className="flex flex-col items-center">
          <IconButton label="Move up" onClick={() => onMove(-1)} disabled={first}>
            <Icon d={ICONS.up} className="h-3.5 w-3.5" />
          </IconButton>
          <IconButton label="Move down" onClick={() => onMove(1)} disabled={last}>
            <Icon d={ICONS.down} className="h-3.5 w-3.5" />
          </IconButton>
          <IconButton label="Remove" danger onClick={onRemove}>
            <Icon d={ICONS.trash} className="h-3.5 w-3.5" />
          </IconButton>
        </div>
      </div>

      {error ? (
        <p role="alert" className="mt-1.5 text-[0.8125rem] text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/* ── Shared ───────────────────────────────────────────────────────────────── */

function AddRow({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-9 w-full items-center justify-center gap-1.5 rounded-control text-[0.8125rem] font-medium text-ink-muted ring-1 ring-border-strong transition-colors hover:bg-surface-sunken hover:text-ink"
    >
      <Icon d={ICONS.plus} className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
