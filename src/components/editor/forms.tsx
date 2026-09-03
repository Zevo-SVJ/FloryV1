"use client";

import { useState } from "react";
import {
  ChoiceField,
  Icon,
  ICONS,
  IconButton,
  ImagePicker,
  TextAreaField,
  TextField,
  Toggle,
} from "@/components/editor/controls";
import { SocialIcon, socialLabel } from "@/components/public/social-icon";
import { newId, reorder, type DraftBlock, type DraftLink, type DraftSocial } from "@/lib/editor/state";
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
  EmbedBlockData,
  GalleryBlockData,
  GalleryItem,
  ImageBlockData,
  LinksBlockData,
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
    case "image":
      return <ImageForm {...props} />;
    case "image_gallery":
      return <GalleryForm {...props} />;
    case "video":
      return <EmbedForm {...props} allowed={VIDEO_PROVIDERS} noun="video" />;
    case "embed":
      return <EmbedForm {...props} allowed={EMBED_PROVIDERS} noun="track, album or playlist" />;
    case "divider":
      return null;
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

      <AddRow
        label="Add link"
        onClick={() =>
          setLinks([...block.links, { id: newId(), title: "", url: "", isActive: true }])
        }
      />
    </div>
  );
}

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

  return (
    <div className="rounded-card bg-surface-sunken p-2.5">
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
        <IconButton label="Delete link" onClick={onRemove} danger>
          <Icon d={ICONS.trash} className="h-3.5 w-3.5" />
        </IconButton>
      </div>

      {urlError ? (
        <p role="alert" className="mt-1.5 text-[0.8125rem] text-danger">
          {urlError}
        </p>
      ) : null}
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
            setItems([...data.items, { id: newId(), url: "", alt: "", caption: "" }])
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
