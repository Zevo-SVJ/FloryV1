import { Hero } from "@/components/sections/Hero";
import { StoryOne, StoryTwo } from "@/components/sections/Stories";
import { ReportPreview } from "@/components/sections/ReportPreview";
import { Reactions } from "@/components/sections/Reactions";
import { Questions } from "@/components/sections/Questions";
import { FinalCta } from "@/components/sections/FinalCta";

/**
 * Blink, in order:
 *
 *  1. the claim, and the film that proves it
 *  2. impressions form whether you like it or not
 *  3. small changes move them
 *  4. what the report actually gives you
 *  5. what people say afterwards
 *  6. reasonable questions
 *  7. one last invitation
 *
 * The product itself is not on this page — it opens over it, from any button.
 */
export default function Home() {
  return (
    <>
      <Hero />
      <StoryOne />
      <StoryTwo />
      <ReportPreview />
      <Reactions />
      <Questions />
      <FinalCta />
    </>
  );
}
