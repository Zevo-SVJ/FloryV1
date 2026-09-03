"use client";

import { useEffect, useRef, useState } from "react";
import { BlockIcon } from "@/components/editor/block-icon";
import { Icon, ICONS } from "@/components/editor/controls";
import { BLOCKS, BLOCK_MENU_ORDER } from "@/lib/blocks/registry";
import type { BlockType } from "@/types/database";

/**
 * Choosing what to add.
 *
 * The whole catalogue at once, each with the sentence from the registry — a
 * creator who has never used a link-in-bio builder should be able to tell what
 * a "Gallery" is without adding one to find out. Eight items is a list, not a
 * wall, so nothing is hidden behind a category.
 *
 * A type that cannot be added twice is shown disabled rather than removed. A
 * menu whose items move around between visits is a menu nobody learns.
 */
export function AddBlock({
  onAdd,
  existing,
}: {
  onAdd: (type: BlockType) => void;
  existing: BlockType[];
}) {
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);

  // Closing on an outside press and on Escape, because this is a menu and
  // those are the two things every menu is expected to do.
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const taken = new Set(existing);

  return (
    <div ref={container} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-card border border-dashed border-border-strong text-[0.9375rem] font-medium text-ink-muted transition-colors hover:border-ink-subtle hover:bg-surface hover:text-ink"
      >
        <Icon d={ICONS.plus} />
        Add block
      </button>

      {open ? (
        <div
          role="menu"
          aria-label="Block types"
          className="absolute bottom-full left-0 z-20 mb-2 w-full overflow-hidden rounded-card border border-border bg-surface shadow-card"
        >
          <ul className="max-h-[26rem] overflow-y-auto p-1.5">
            {BLOCK_MENU_ORDER.map((type) => {
              const definition = BLOCKS[type];
              const disabled = !definition.multiple && taken.has(type);

              return (
                <li key={type}>
                  <button
                    type="button"
                    role="menuitem"
                    disabled={disabled}
                    onClick={() => {
                      onAdd(type);
                      setOpen(false);
                    }}
                    className="flex w-full items-start gap-3 rounded-control px-2.5 py-2.5 text-left transition-colors hover:bg-surface-sunken disabled:pointer-events-none disabled:opacity-40"
                  >
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-control bg-surface-sunken text-ink-muted">
                      <BlockIcon type={type} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-ink">
                        {definition.label}
                        {disabled ? (
                          <span className="ml-1.5 text-[0.75rem] font-normal text-ink-subtle">
                            already added
                          </span>
                        ) : null}
                      </span>
                      <span className="block text-[0.8125rem] leading-snug text-ink-subtle">
                        {definition.description}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
