import { Hero } from "@/components/sections/Hero";
import { PerceptionSection } from "@/components/sections/PerceptionSection";
import { ShiftSection } from "@/components/sections/ShiftSection";
import { AnalyzeExperience } from "@/components/sections/AnalyzeExperience";
import { Testimonials } from "@/components/sections/Testimonials";
import { FinalCta } from "@/components/sections/FinalCta";

/**
 * Blink, in order:
 *
 *  1. the claim, and the film that proves it
 *  2. impressions form whether you like it or not
 *  3. small changes move them
 *  4. try it — 5. watch it read — 6. read the report
 *  7. what other people found
 *  8. one last invitation
 */
export default function Home() {
  return (
    <>
      <Hero />
      <PerceptionSection />
      <ShiftSection />
      <AnalyzeExperience />
      <Testimonials />
      <FinalCta />
    </>
  );
}
