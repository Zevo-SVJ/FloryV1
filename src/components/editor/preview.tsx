"use client";

import { PublicPage } from "@/components/public/public-page";
import { draftToPublicPage, type Draft } from "@/lib/editor/state";

/**
 * The page, as the world will see it.
 *
 * Not a second renderer. The draft is reshaped into the rows the database
 * would hold and passed through the same `toPublicPage` and the same
 * components the public route uses — so a hidden block disappears here for the
 * same reason it disappears there, and there is no version of "the editor
 * looked different" that is not also a bug on the live page.
 *
 * Framed as a phone because that is where these pages are read. A preview
 * shown at desktop width would flatter every layout and warn about none of
 * them.
 *
 * `pointer-events-none` inside the frame: this is a picture of a page, not a
 * page. Letting somebody click a link in the preview would navigate the editor
 * away from unsaved work, which is a strange way to lose an afternoon.
 */
export function Preview({ draft }: { draft: Draft }) {
  /*
   * Shaped once per render, by the same function the public route calls. The
   * design travels inside the result, so a theme change is a new object and
   * React re-renders — there is no separate path by which the preview could
   * learn about a design change late, or not at all.
   */
  const page = draftToPublicPage(draft);

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-full max-w-[22rem]">
        <div className="overflow-hidden rounded-[2rem] border border-border shadow-card ring-1 ring-black/5">
          <div
            aria-hidden
            className="max-h-[min(76vh,44rem)] overflow-y-auto [scrollbar-width:thin]"
          >
            <div className="pointer-events-none [&_.sm-page]:min-h-[34rem]">
              <PublicPage page={page} design={page.design} />
            </div>
          </div>
        </div>

        {/*
         * A short fade at the bottom edge. Without it a page taller than the
         * frame ends mid-sentence against a hard border, which reads as a
         * rendering bug rather than as something that scrolls. Decorative and
         * non-interactive, so it is hidden from assistive technology and does
         * not intercept the scroll.
         */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-10 rounded-b-[2rem] bg-gradient-to-t from-black/15 to-transparent dark:from-black/35"
        />
      </div>

      {/*
       * The preview itself is `aria-hidden`: every link and heading in it is a
       * duplicate of something the editor already exposes as a control, and
       * announcing the whole page twice makes the editor twice as long to
       * navigate. This line is what a screen reader hears instead.
       */}
      <p className="mt-3 text-center text-[0.8125rem] text-ink-subtle">
        A preview of your page. Changes appear here before you save.
      </p>
    </div>
  );
}
