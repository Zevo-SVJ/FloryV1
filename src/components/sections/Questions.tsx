import { Accordion } from "@/components/ui/Accordion";
import { Label, Reveal } from "@/components/ui/Reveal";
import { FAQ } from "@/lib/mock/faq";

export function Questions() {
  return (
    <section id="questions" className="relative py-20 sm:py-28">
      <div className="gutter">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <div className="max-w-sm">
            <Reveal>
              <Label accent>Before you upload</Label>
            </Reveal>
            <Reveal delay={0.08}>
              <h2 className="mt-6 text-display">Reasonable questions.</h2>
            </Reveal>
          </div>

          <Reveal delay={0.12}>
            <Accordion items={FAQ} />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
