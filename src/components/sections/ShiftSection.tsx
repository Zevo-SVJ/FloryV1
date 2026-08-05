import { ShiftCinematic } from "@/components/cinematics/ShiftCinematic";
import { Eyebrow, Section } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";

/**
 * Section three. The stage leads, the sentence follows — the opposite
 * arrangement to the hero, so the page keeps changing shape as you scroll.
 */
export function ShiftSection() {
  return (
    <Section height="screen" divider>
      <div className="edge">
        <div className="grid items-center gap-16 lg:grid-cols-[1fr_1.05fr] lg:gap-12">
          <Reveal y={30} className="order-2 lg:order-1">
            <ShiftCinematic />
          </Reveal>

          <div className="order-1 max-w-md lg:order-2">
            <Reveal>
              <Eyebrow accent>Cause and effect</Eyebrow>
            </Reveal>
            <Reveal delay={0.1}>
              <h2 className="mt-7 text-display font-medium">
                Small changes.
                <br />
                Different <span className="serif-italic">perception</span>.
              </h2>
            </Reveal>
            <Reveal delay={0.2}>
              <p className="mt-8 max-w-sm text-lede text-ink-muted">
                Three edits. No new work, no new followers, no new photos taken.
              </p>
            </Reveal>
          </div>
        </div>
      </div>
    </Section>
  );
}
