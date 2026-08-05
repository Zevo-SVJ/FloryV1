import { PerceptionScene } from "@/components/scene/PerceptionScene";
import { ShiftScene } from "@/components/scene/ShiftScene";
import { CtaButton } from "@/components/ui/CtaButton";
import { Label, Reveal } from "@/components/ui/Reveal";

/**
 * Story one: impressions form whether you like it or not.
 *
 * One sentence, then the scene. The section carries the second call to action,
 * placed where the idea has just landed.
 */
export function StoryOne() {
  return (
    <section className="relative flex min-h-[100svh] flex-col justify-center py-20 sm:py-24">
      <div className="gutter">
        <div className="mx-auto max-w-3xl text-center">
          <Reveal>
            <Label accent>Before a word is read</Label>
          </Reveal>
          <Reveal delay={0.08}>
            <h2 className="mt-6 text-display">
              Every profile creates an instant impression.
            </h2>
          </Reveal>
        </div>

        <Reveal delay={0.16} y={28} className="mt-8 sm:mt-10">
          <PerceptionScene />
        </Reveal>

        <Reveal delay={0.1} className="mt-10 flex justify-center">
          <CtaButton size="md" variant="secondary" label="See mine" />
        </Reveal>
      </div>
    </section>
  );
}

/**
 * Story two: the impression is not fixed.
 *
 * The scene leads and the sentence follows — the reverse of the hero, so the
 * page keeps changing shape as it is scrolled.
 */
export function StoryTwo() {
  return (
    <section className="relative flex min-h-[100svh] flex-col justify-center py-20 sm:py-24">
      <div className="gutter">
        <div className="grid items-center gap-12 lg:grid-cols-[1.06fr_0.94fr] lg:gap-10">
          <Reveal y={26} className="order-2 lg:order-1">
            <ShiftScene />
          </Reveal>

          <div className="order-1 max-w-md lg:order-2">
            <Reveal>
              <Label accent>Cause and effect</Label>
            </Reveal>
            <Reveal delay={0.08}>
              <h2 className="mt-6 text-display">
                Small changes.
                <br />
                Different perception.
              </h2>
            </Reveal>
            <Reveal delay={0.16}>
              <p className="mt-6 max-w-sm text-lede text-ink-3">
                Three edits. No new work, no new followers, no new photos taken.
              </p>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
