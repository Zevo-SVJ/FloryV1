import { Eyebrow, Section } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";
import { TESTIMONIALS } from "@/lib/mock/testimonials";

/**
 * Section seven.
 *
 * Four quotes, hairlines, and nothing else. No logos, no star ratings, no
 * cards floating over gradients — the words are the design.
 */
export function Testimonials() {
  return (
    <Section divider>
      <div className="edge">
        <div className="max-w-2xl">
          <Reveal>
            <Eyebrow accent>Reactions</Eyebrow>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="mt-7 text-display font-medium">What it feels like.</h2>
          </Reveal>
        </div>

        <ul className="mt-20 grid gap-x-16 gap-y-4 md:grid-cols-2 lg:gap-x-24">
          {TESTIMONIALS.map((testimonial, index) => (
            <li key={testimonial.name}>
              <Reveal delay={(index % 2) * 0.1} className="h-full">
                <figure className="flex h-full flex-col border-t border-line pb-6 pt-8">
                  <blockquote className="text-[1.0625rem] leading-[1.62] tracking-[-0.012em] sm:text-[1.125rem]">
                    {testimonial.quote}
                  </blockquote>

                  <figcaption className="mt-8 flex items-center gap-3.5">
                    <span
                      aria-hidden
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-paper-deep text-[0.6875rem] font-medium tracking-[0.04em] text-ink-muted"
                    >
                      {testimonial.name
                        .split(" ")
                        .map((part) => part[0])
                        .join("")}
                    </span>
                    <span className="text-[0.875rem]">
                      <span className="font-medium">{testimonial.name}</span>
                      <span className="text-ink-faint"> · {testimonial.role}</span>
                    </span>
                  </figcaption>
                </figure>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}
