"use server";

import { createClient } from "@/lib/supabase/server";
import { requireClaimedProfile } from "@/lib/auth/dal";
import { revalidatePublicPage } from "@/lib/public-page/revalidate";
import { savePageSchema } from "@/lib/editor/save-schema";
import { BLOCKS, blockLabel } from "@/lib/blocks/registry";
import {
  IMAGE_TYPES,
  MAX_UPLOAD_BYTES,
  UPLOAD_MESSAGES,
  isImageMime,
  sniffImageMime,
} from "@/lib/media/constraints";
import { mediaHost } from "@/lib/media/url";
import type { DeleteResult, SaveResult, UploadResult } from "@/lib/editor/results";
import type { BlockType } from "@/types/database";

/**
 * Everything the editor writes.
 *
 * Three actions, and one rule that governs all of them: the owner is taken
 * from the session and never from the request. `requireClaimedProfile()` is
 * the first line of each, and Row Level Security is what holds if somebody
 * skips the editor entirely and posts here directly — which they can, because
 * a Server Action is a URL.
 *
 * Errors come back as values rather than thrown, because every one of them has
 * a sentence a creator should read. A stack trace reaching the browser would
 * be both useless to them and a description of our schema.
 */

const BUCKET = "page-media";

/** Anything unexpected, in words a creator can act on. */
const GENERIC_SAVE_FAILURE =
  "That did not save. Check your connection and try again — your changes are still here.";

/* ── Saving the page ──────────────────────────────────────────────────────── */

/**
 * Replace the creator's page with the draft they are holding.
 *
 * The payload arrives as a JSON string rather than a `FormData` of a hundred
 * fields: the editor's state is a tree, and flattening a tree into form keys
 * only to rebuild it here would be a second serialization format to keep in
 * step with the first.
 *
 * The write itself is one call to `save_page`, a `security invoker` function
 * that does the whole replacement in a single transaction. That matters more
 * than it looks: reordering four blocks and deleting a gallery is one change a
 * creator made, and applying it as nine statements from here would let a
 * dropped connection leave a page nobody composed.
 */
export async function savePage(payload: string): Promise<SaveResult> {
  const profile = await requireClaimedProfile();

  let raw: unknown;
  try {
    raw = JSON.parse(payload);
  } catch {
    return { ok: false, message: GENERIC_SAVE_FAILURE };
  }

  const parsed = savePageSchema.safeParse(raw);
  if (!parsed.success) return describeValidationFailure(raw, parsed.error.issues);

  const supabase = await createClient();

  const { error } = await supabase.rpc("save_page", {
    payload: parsed.data as unknown as Record<string, unknown>,
  });

  if (error) {
    // 23505 on social_links: two rows claiming the same platform. The editor
    // prevents it, so reaching here means something posted directly — but the
    // message is still the useful one rather than a code.
    if (error.code === "23505") {
      return {
        ok: false,
        message: "You have two entries for the same platform. Remove one and save again.",
      };
    }
    return { ok: false, message: GENERIC_SAVE_FAILURE };
  }

  revalidatePublicPage(profile.username);
  return { ok: true, savedAt: new Date().toISOString() };
}

/**
 * Turn the first schema failure into a sentence about a block.
 *
 * The editor validates the same fields as somebody types, so anything that
 * reaches here is either a stale draft or a direct post. Naming the block —
 * "Your Gallery block needs an image" — is what makes the first case
 * recoverable instead of mysterious.
 */
function describeValidationFailure(
  raw: unknown,
  issues: { path: PropertyKey[]; message: string }[],
): SaveResult {
  const issue = issues[0];
  if (!issue) return { ok: false, message: GENERIC_SAVE_FAILURE };

  const [section, index] = issue.path;

  if (section === "blocks" && typeof index === "number") {
    const blocks =
      (raw as { blocks?: { id?: unknown; type?: unknown; data?: unknown }[] }).blocks ?? [];
    const block = blocks[index];
    const id = typeof block?.id === "string" ? block.id : undefined;
    const type = typeof block?.type === "string" ? (block.type as BlockType) : null;
    const label = type ? blockLabel(type) : "block";

    /*
     * A block that is still exactly as it was added has not been filled in
     * rather than filled in wrongly, and "Video: That link is not supported"
     * is a strange thing to say about a block with no link in it. Naming the
     * two ways out is more use than repeating the schema.
     */
    if (type && isUntouched(type, block?.data)) {
      return {
        ok: false,
        message: `Your ${label} block is empty. Fill it in, or delete it.`,
        blockId: id,
      };
    }

    return { ok: false, message: `${label}: ${issue.message}`, blockId: id };
  }

  if (section === "socials") {
    return { ok: false, message: `Social links: ${issue.message}` };
  }

  if (section === "profile") {
    return { ok: false, message: `Profile: ${issue.message}` };
  }

  return { ok: false, message: GENERIC_SAVE_FAILURE };
}

/* ── Uploading an image ───────────────────────────────────────────────────── */

/**
 * Store one image and return the URL the page will use.
 *
 * Uploads happen immediately rather than being held in the draft until save —
 * a File cannot live in React state across a page reload, and a creator who
 * picked four gallery images should not lose them to a refresh. The cost is
 * that abandoning an edit can leave an unreferenced object in the bucket. That
 * is the right way round: an orphaned image is invisible and cheap, where a
 * lost upload is a creator doing the work twice.
 *
 * Three checks, and only the last one is trustworthy on its own. Size and the
 * declared type are cheap and catch mistakes; the file's leading bytes are
 * what decide, because `File.type` in a multipart body is a string the client
 * chose. Storage applies its own limit and MIME list on top, so a request that
 * never passes through here is refused too.
 */
export async function uploadImage(formData: FormData): Promise<UploadResult> {
  const profile = await requireClaimedProfile();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: UPLOAD_MESSAGES.empty };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, message: UPLOAD_MESSAGES.too_large };
  }
  if (!isImageMime(file.type)) {
    return { ok: false, message: UPLOAD_MESSAGES.wrong_type };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const sniffed = sniffImageMime(bytes);
  if (!sniffed) return { ok: false, message: UPLOAD_MESSAGES.not_an_image };

  /*
   * The path is built entirely from values we control: the owner's id, which
   * comes from the session, and a fresh uuid. The uploader's filename is never
   * used — it is attacker-controlled text that would otherwise end up in a
   * URL, and it carries nothing a creator will ever need.
   */
  const path = `${profile.id}/${crypto.randomUUID()}.${IMAGE_TYPES[sniffed]}`;

  const supabase = await createClient();
  const { error } = await supabase.storage.from(BUCKET).upload(path, bytes, {
    contentType: sniffed,
    // A year: the name is a uuid, so the bytes at this path never change.
    cacheControl: "31536000",
    upsert: false,
  });

  if (error) {
    return { ok: false, message: "That image did not upload. Try again." };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(path);

  return { ok: true, url: publicUrl };
}

/**
 * Remove an image the creator replaced or deleted.
 *
 * The path is derived from the URL and then checked against the session's own
 * folder before anything is deleted. Storage's policy says the same thing and
 * is the one that actually holds — this check exists so the action refuses
 * loudly rather than issuing a delete it knows will do nothing.
 */
export async function deleteImage(url: string): Promise<DeleteResult> {
  const profile = await requireClaimedProfile();

  const path = storagePathFrom(url);
  if (!path || !path.startsWith(`${profile.id}/`)) {
    return { ok: false, message: "That image is not yours to remove." };
  }

  const supabase = await createClient();
  const { error } = await supabase.storage.from(BUCKET).remove([path]);

  return error ? { ok: false, message: "That image could not be removed." } : { ok: true };
}

/**
 * `https://<project>.supabase.co/storage/v1/object/public/page-media/<path>`
 * reduced to `<path>`, or null if it is not one of ours.
 */
function storagePathFrom(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  if (parsed.protocol !== "https:" || parsed.hostname !== mediaHost()) return null;

  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const at = parsed.pathname.indexOf(marker);
  if (at === -1) return null;

  const path = decodeURIComponent(parsed.pathname.slice(at + marker.length));
  // `..` in a storage key is not traversal the way it is on a filesystem, but
  // there is no reason for one of our own paths to contain it.
  return path.length > 0 && !path.includes("..") ? path : null;
}

/** Whether a block still holds exactly what it was created with. */
function isUntouched(type: BlockType, data: unknown): boolean {
  return JSON.stringify(data ?? {}) === JSON.stringify(BLOCKS[type].defaults());
}
