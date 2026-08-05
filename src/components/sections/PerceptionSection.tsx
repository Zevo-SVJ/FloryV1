import { PerceptionCinematic } from "@/components/cinematics/PerceptionCinematic";
import { Eyebrow, Section } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";

/**
 * Section two. One sentence, and a scene that makes it obvious.
 */
export function PerceptionSection() {
  return (
    <Section id="how" height="screen" divider>
      <div className="edge">
        <div className="mx-auto max-w-3xl text-center">
          <Reveal>
            <Eyebrow accent>Before a word is read</Eyebrow>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="mt-7 text-display font-medium">
              Every profile creates an instant impression.
            </h2>
          </Reveal>
        </div>

        <Reveal delay={0.2} y={32} className="mt-8 lg:mt-10">
          <PerceptionCinematic />
        </Reveal>
      </div>
    </Section>
  );
}
