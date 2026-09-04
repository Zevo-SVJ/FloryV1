import { z } from "zod";

/**
 * Enough of the previous state to put a change back.
 *
 * Three shapes, one per action that writes, and every one of them is small:
 * the positions that moved, or the single flag that flipped. This is
 * deliberately not an event log of the page — reversing one optimization is
 * the whole requirement, and a general-purpose history of every row would be a
 * far larger thing to build, store and get right.
 *
 * It is parsed on the way back out with the same schema it was written with,
 * because it is stored as `jsonb` and a column typed `jsonb` is a column that
 * can hold anything. Nothing here trusts the shape it finds.
 */

const uuid = z.string().uuid();

export const undoSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("positions"),
    links: z.array(z.object({ id: uuid, position: z.number().int().min(0).max(1000) })).max(200),
  }),
  z.object({ kind: z.literal("featured"), linkId: uuid, previous: z.boolean() }),
  z.object({ kind: z.literal("active"), linkId: uuid, previous: z.boolean() }),
]);

export type UndoPayload = z.infer<typeof undoSchema>;

/**
 * A new position for every link that has one, given a desired order for some
 * of them.
 *
 * The links named in `desired` are placed, in that order, into the slots they
 * currently occupy between them; every other link keeps the slot it has. That
 * is what stops a reorder from disturbing rows nobody mentioned — an
 * unpublished link sitting at position 3 stays at position 3, rather than
 * being swept to the end by a sort that only knew about the visible ones.
 */
export function reorderWithin(
  all: readonly { id: string }[],
  desired: readonly string[],
): { id: string; position: number }[] {
  const present = new Set(all.map((link) => link.id));

  /*
   * Filtered to ids that are actually here, and filtered *before* the slots
   * are handed out.
   *
   * Doing it afterwards was a real bug and a quiet one: an unknown id
   * consumed a slot, so every link after it in the desired order shifted up
   * one and the last of them fell back to its original index — producing two
   * links at the same position rather than an error. Caught by the test that
   * hands this function an id from somebody else's page.
   */
  const moving = desired.filter((id) => present.has(id));
  const movingSet = new Set(moving);
  const slots: number[] = [];

  all.forEach((link, index) => {
    if (movingSet.has(link.id)) slots.push(index);
  });

  const placed = new Map<string, number>();
  moving.forEach((id, index) => {
    const slot = slots[index];
    if (slot !== undefined) placed.set(id, slot);
  });

  return all.map((link, index) => ({
    id: link.id,
    position: placed.get(link.id) ?? index,
  }));
}
