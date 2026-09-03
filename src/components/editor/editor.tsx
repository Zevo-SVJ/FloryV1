"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToVerticalAxis, restrictToParentElement } from "@dnd-kit/modifiers";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { AddBlock } from "@/components/editor/add-block";
import { BLOCKS } from "@/lib/blocks/registry";
import { DesignPanel } from "@/components/editor/design-panel";
import { BlockCard } from "@/components/editor/block-card";
import { Preview } from "@/components/editor/preview";
import { ProfilePanel } from "@/components/editor/profile-panel";
import { savePage } from "@/lib/editor/actions";
import {
  draftsEqual,
  newBlock,
  reorder,
  savePayload,
  type Draft,
  type DraftBlock,
  type DraftProfile,
  type DraftSocial,
} from "@/lib/editor/state";
import { siteOrigin } from "@/lib/editor/origin";
import { cn } from "@/lib/utils/cn";
import type { BlockType } from "@/types/database";
import type { DesignConfig } from "@/lib/design/types";

/**
 * The editor.
 *
 * One piece of state — the draft — and one way to persist it. Everything a
 * creator does is a local change to that object, which is what makes the
 * preview instant and the save honest: there is no request in flight while
 * somebody types, and no half-applied page if their connection drops.
 *
 * The alternative, a write per interaction, is what most builders do. It makes
 * "Saved" meaningless, turns a reorder into eight requests, and leaves no
 * moment at which the page is a thing the creator has finished composing.
 *
 * Two panels on a desktop, two tabs on a phone. Not a shrunken two-column
 * layout — a preview squeezed beside a form on a 390px screen is too small to
 * judge and leaves the form too narrow to use.
 */

type Status =
  | { kind: "clean" }
  | { kind: "dirty" }
  | { kind: "saving" }
  | { kind: "saved" }
  | { kind: "failed"; message: string };

/**
 * The last thing a save did, and the draft it was about.
 *
 * `forDraft` is what keeps a failure from outliving its cause. A creator whose
 * save failed on an empty Video block fixes the block; the draft becomes a new
 * object; the message stops applying and the bar goes back to saying there are
 * unsaved changes. Comparing by identity is exact here because every mutation
 * replaces the draft object.
 */
type Outcome =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved"; forDraft: Draft }
  | { kind: "failed"; message: string; blockId?: string; forDraft: Draft };

export function Editor({ initial }: { initial: Draft }) {
  const [draft, setDraft] = useState<Draft>(initial);
  /** What is on the server. The draft is compared against this, not a flag. */
  const [saved, setSaved] = useState<Draft>(initial);
  const [outcome, setOutcome] = useState<Outcome>({ kind: "idle" });
  const [expanded, setExpanded] = useState<string | null>(null);
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  /*
   * Content and design are two jobs, and mixing them puts a colour picker
   * between a creator and their links. They share one draft and one Save, so
   * the split is presentational — which is why it is a tab and not a route.
   */
  const [pane, setPane] = useState<"content" | "design">("content");
  const [pending, startTransition] = useTransition();

  /*
   * Derived rather than stored. A boolean set by every mutation would drift
   * the first time somebody undid a change by hand — typing a character and
   * deleting it should leave the page clean, and comparing says so for free.
   */
  const dirty = useMemo(() => !draftsEqual(draft, saved), [draft, saved]);

  const status = useMemo<Status>(() => {
    if (outcome.kind === "saving") return { kind: "saving" };
    // A failure only speaks for the draft it happened to.
    if (outcome.kind === "failed" && outcome.forDraft === draft) {
      return { kind: "failed", message: outcome.message };
    }
    if (dirty) return { kind: "dirty" };
    if (outcome.kind === "saved") return { kind: "saved" };
    return { kind: "clean" };
  }, [outcome, dirty, draft]);

  const problemBlock =
    outcome.kind === "failed" && outcome.forDraft === draft ? outcome.blockId : undefined;

  /* ── Leaving with unsaved work ─────────────────────────────────────────── */

  useEffect(() => {
    if (!dirty) return;

    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);

    /*
     * `beforeunload` covers a reload, a closed tab and a typed URL. It does not
     * cover a client-side navigation, which is how somebody actually leaves —
     * by pressing "Dashboard" in the nav above. Catching the click in the
     * capture phase is the smallest thing that works, and it works for links
     * this component never rendered.
     */
    const intercept = (event: MouseEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.button !== 0) {
        return;
      }

      const anchor = (event.target as HTMLElement | null)?.closest("a");
      const href = anchor?.getAttribute("href");
      if (!anchor || !href || href.startsWith("#")) return;
      if (anchor.target === "_blank") return;

      const destination = new URL(anchor.href, window.location.href);
      if (destination.origin !== window.location.origin) return;
      if (destination.pathname === window.location.pathname) return;

      const leave = window.confirm(
        "You have unsaved changes to your page. Leave without saving?",
      );
      if (!leave) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    document.addEventListener("click", intercept, true);
    return () => {
      window.removeEventListener("beforeunload", warn);
      document.removeEventListener("click", intercept, true);
    };
  }, [dirty]);

  /* ── Mutations ─────────────────────────────────────────────────────────── */

  const setProfile = useCallback((patch: Partial<DraftProfile>) => {
    setDraft((current) => ({ ...current, profile: { ...current.profile, ...patch } }));
  }, []);

  const setSocials = useCallback((socials: DraftSocial[]) => {
    setDraft((current) => ({ ...current, socials }));
  }, []);

  const setDesign = useCallback((design: DesignConfig) => {
    setDraft((current) => ({ ...current, design }));
  }, []);

  const updateBlock = useCallback((id: string, patch: Partial<DraftBlock>) => {
    setDraft((current) => ({
      ...current,
      blocks: current.blocks.map((block) =>
        block.id === id ? { ...block, ...patch } : block,
      ),
    }));
  }, []);

  const removeBlock = useCallback((id: string) => {
    setDraft((current) => ({
      ...current,
      blocks: current.blocks.filter((block) => block.id !== id),
    }));
  }, []);

  const moveBlock = useCallback((index: number, delta: 1 | -1) => {
    setDraft((current) => ({
      ...current,
      blocks: reorder(current.blocks, index, index + delta),
    }));
  }, []);

  function addBlock(type: BlockType) {
    const block = newBlock(type);
    setDraft((current) => ({ ...current, blocks: [...current.blocks, block] }));
    // Opened straight away: an empty block that says nothing about itself is a
    // dead end, and the next thing anybody wants is the form.
    setExpanded(block.id);
  }

  /* ── Saving ────────────────────────────────────────────────────────────── */

  function save() {
    /*
     * The draft this handler closed over, which is the one on screen: React
     * hands a click the callback from the render that produced the button.
     * Naming it makes what the server received unambiguous below.
     */
    const snapshot = draft;
    setOutcome({ kind: "saving" });

    startTransition(async () => {
      const result = await savePage(JSON.stringify(savePayload(snapshot)));

      if (!result.ok) {
        setOutcome({
          kind: "failed",
          message: result.message,
          blockId: result.blockId,
          forDraft: snapshot,
        });
        if (result.blockId) setExpanded(result.blockId);
        return;
      }

      /*
       * The snapshot becomes the new baseline, not the current draft. Anything
       * typed while the request was in flight stays unsaved, which is the
       * truthful answer — the server has the snapshot and nothing more.
       */
      setSaved(snapshot);
      setOutcome({ kind: "saved", forDraft: snapshot });
    });
  }

  /* ── Drag and drop ─────────────────────────────────────────────────────── */

  const sensors = useSensors(
    // A small distance before a drag begins, so a tap on the handle is still a
    // tap and a scroll on a phone is still a scroll.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  /*
   * What a screen reader hears while a block is being dragged.
   *
   * dnd-kit's defaults say "Picked up draggable item
   * b0000000-0000-4000-8000-000000000001." — a uuid, read out character by
   * character, for a control whose whole job is to tell somebody which of
   * eleven blocks they are holding and where it has got to. These say
   * "Picked up the Socials block, 1 of 11" instead, and no internal id ever
   * reaches a person.
   *
   * `draft.blocks` is the source for both the name and the position, so the
   * announcement is the same list the arrows and the save use — there is no
   * second model of the order that could disagree with the one on screen.
   */
  const announcements = useMemo(() => {
    const describe = (id: string | number) => {
      const index = draft.blocks.findIndex((block) => block.id === id);
      if (index === -1) return { name: "block", position: "" };
      const type = draft.blocks[index]?.type;
      return {
        name: `${type ? BLOCKS[type].label : "block"} block`,
        position: `${index + 1} of ${draft.blocks.length}`,
      };
    };

    return {
      onDragStart({ active }: { active: { id: string | number } }) {
        const { name, position } = describe(active.id);
        return `Picked up the ${name}, ${position}.`;
      },
      onDragOver({ active, over }: { active: { id: string | number }; over: { id: string | number } | null }) {
        if (!over) return `The ${describe(active.id).name} is not over a position.`;
        /*
         * Silent while the block is still over its own position. dnd-kit
         * fires this immediately after the pick-up — the block is over
         * itself — and the announcement replaced "Picked up the Socials
         * block, 1 of 11" within a frame, so the one message that says what
         * you are holding was the one nobody heard. `undefined` is dnd-kit's
         * own way of saying "nothing to announce".
         */
        if (over.id === active.id) return undefined;
        return `Moved to position ${describe(over.id).position}.`;
      },
      onDragEnd({ active, over }: { active: { id: string | number }; over: { id: string | number } | null }) {
        const { name } = describe(active.id);
        if (!over) return `Dropped the ${name} back where it started.`;
        return `Dropped the ${name} at position ${describe(over.id).position}.`;
      },
      onDragCancel({ active }: { active: { id: string | number } }) {
        return `Cancelled. The ${describe(active.id).name} stayed where it was.`;
      },
    };
  }, [draft.blocks]);

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setDraft((current) => {
      const from = current.blocks.findIndex((block) => block.id === active.id);
      const to = current.blocks.findIndex((block) => block.id === over.id);
      return { ...current, blocks: reorder(current.blocks, from, to) };
    });
  }

  const blockIds = draft.blocks.map((block) => block.id);
  const existingTypes = draft.blocks.map((block) => block.type);

  return (
    <div className="flex min-h-[calc(100dvh-4rem)] flex-col">
      <SaveBar
        username={draft.profile.username}
        status={status}
        pending={pending}
        dirty={dirty}
        onSave={save}
        tab={tab}
        setTab={setTab}
      />

      {/*
       * `min-w-0` on both columns is load-bearing, not decoration. A grid item's
       * automatic minimum size is its min-content width, so without it the
       * editor column refuses to shrink below the widest block summary — and a
       * phone browser responds by widening the layout viewport rather than
       * showing a scrollbar, which silently zooms the whole page out.
       */}
      <div className="grid flex-1 gap-8 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:items-start">
        <div className={cn("min-w-0 space-y-4", tab === "preview" && "hidden lg:block")}>
          <PaneTabs pane={pane} setPane={setPane} />

          {pane === "design" ? (
            <DesignPanel design={draft.design} onChange={setDesign} />
          ) : (
            <>
          <ProfilePanel profile={draft.profile} onChange={setProfile} />

          {/*
            * The `id` is not cosmetic. Without one, dnd-kit derives the id of
            * its screen-reader instructions from a module-level counter, and
            * that counter is a different number on the server than in a fresh
            * browser module — so every drag handle shipped with
            * `aria-describedby="DndDescribedBy-9"` pointing at an element the
            * client had named `DndDescribedBy-0`. The keyboard instructions
            * for reordering blocks were, in other words, addressed to nothing.
            * A fixed id makes both renders agree.
            */}
          <DndContext
            id="editor-blocks"
            accessibility={{
              announcements,
              // The default says "draggable item". This says what it is.
              screenReaderInstructions: {
                draggable:
                  "Press the space bar to pick up a block. Use the up and down arrows to move it, " +
                  "space again to drop it, or escape to leave it where it was.",
              },
            }}
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis, restrictToParentElement]}
            onDragEnd={onDragEnd}
          >
            <SortableContext items={blockIds} strategy={verticalListSortingStrategy}>
              <ul className="space-y-2">
                {draft.blocks.map((block, index) => (
                  <BlockCard
                    key={block.id}
                    block={block}
                    index={index}
                    count={draft.blocks.length}
                    expanded={expanded === block.id}
                    onToggleExpanded={() =>
                      setExpanded((current) => (current === block.id ? null : block.id))
                    }
                    update={(patch) => updateBlock(block.id, patch)}
                    remove={() => removeBlock(block.id)}
                    move={(delta) => moveBlock(index, delta)}
                    socials={draft.socials}
                    setSocials={setSocials}
                    problem={
                      problemBlock === block.id && status.kind === "failed"
                        ? status.message
                        : undefined
                    }
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>

          {draft.blocks.length === 0 ? <EmptyState /> : null}

          <AddBlock onAdd={addBlock} existing={existingTypes} />
            </>
          )}
        </div>

        <div
          className={cn(
            "min-w-0 lg:sticky lg:top-24",
            tab === "edit" ? "hidden lg:block" : "block",
          )}
        >
          <Preview draft={draft} />
        </div>
      </div>
    </div>
  );
}

/**
 * Content or design.
 *
 * A segmented control rather than a sidebar, because on a phone there is no
 * room for a sidebar and a creator should not meet two different editors
 * depending on their screen.
 */
function PaneTabs({
  pane,
  setPane,
}: {
  pane: "content" | "design";
  setPane: (pane: "content" | "design") => void;
}) {
  return (
    <div className="flex gap-1 rounded-control bg-surface-sunken p-1">
      {(["content", "design"] as const).map((value) => (
        <button
          key={value}
          type="button"
          onClick={() => setPane(value)}
          aria-current={pane === value}
          className={cn(
            "h-8 flex-1 rounded-[7px] text-[0.8125rem] font-medium capitalize transition-colors",
            pane === value ? "bg-surface text-ink shadow-control" : "text-ink-muted",
          )}
        >
          {value}
        </button>
      ))}
    </div>
  );
}

/* ── The bar that says what is happening ──────────────────────────────────── */

function SaveBar({
  username,
  status,
  pending,
  dirty,
  onSave,
  tab,
  setTab,
}: {
  username: string;
  status: Status;
  pending: boolean;
  dirty: boolean;
  onSave: () => void;
  tab: "edit" | "preview";
  setTab: (tab: "edit" | "preview") => void;
}) {
  return (
    <div className="sticky top-0 z-30 -mx-5 mb-6 border-b border-border bg-canvas/90 px-5 py-3 backdrop-blur sm:-mx-8 sm:px-8">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 items-center gap-3">
          <h1 className="shrink-0 text-[0.9375rem] font-semibold tracking-tight">Editor</h1>
          <Link
            href={`/${username}`}
            className="hidden truncate py-1 font-mono text-[0.8125rem] text-ink-subtle transition-colors hover:text-ink sm:block"
          >
            {siteOrigin()}/{username}
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <StatusLabel status={status} />

          <button
            type="button"
            onClick={onSave}
            disabled={pending || !dirty}
            className="h-9 shrink-0 rounded-control bg-accent px-4 text-sm font-medium text-accent-ink shadow-control transition-colors hover:bg-accent-hover disabled:pointer-events-none disabled:opacity-40"
          >
            {pending ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {/* Edit and preview are two views on a phone, side by side above `lg`. */}
      <div className="mt-3 flex gap-1 rounded-control bg-surface-sunken p-1 lg:hidden">
        {(["edit", "preview"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            aria-current={tab === value}
            className={cn(
              "h-8 flex-1 rounded-[7px] text-[0.8125rem] font-medium capitalize transition-colors",
              tab === value ? "bg-surface text-ink shadow-control" : "text-ink-muted",
            )}
          >
            {value}
          </button>
        ))}
      </div>
    </div>
  );
}

function StatusLabel({ status }: { status: Status }) {
  const [label, tone] = describe(status);

  return (
    <p
      // Announced when it changes, so a save that failed is not a colour a
      // screen reader user never learns about.
      role="status"
      aria-live="polite"
      className={cn("truncate text-right text-[0.8125rem]", tone)}
    >
      {label}
    </p>
  );
}

function describe(status: Status): [string, string] {
  switch (status.kind) {
    case "saving":
      return ["Saving…", "text-ink-muted"];
    case "dirty":
      return ["Unsaved changes", "text-ink-muted"];
    case "saved":
      return ["Saved", "text-success"];
    case "failed":
      return [status.message, "text-danger"];
    case "clean":
      return ["", "text-ink-subtle"];
  }
}

/* ── Nothing here yet ─────────────────────────────────────────────────────── */

function EmptyState() {
  return (
    <div className="rounded-card border border-border bg-surface px-5 py-8 text-center">
      <p className="text-[0.9375rem] font-medium text-ink">Build your ShowMe page</p>
      <p className="mx-auto mt-1.5 max-w-[36ch] text-[0.8125rem] leading-relaxed text-ink-muted">
        Add a block to begin. Most pages start with your social profiles and a
        few links, then grow images and video from there.
      </p>
    </div>
  );
}
