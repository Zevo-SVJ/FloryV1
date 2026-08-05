"use client";

import { motion } from "framer-motion";
import { PersonAvatar } from "@/components/ui/Avatar";
import { IconHeart, IconVerified } from "@/components/ui/Icons";
import { Marquee } from "@/components/ui/Marquee";
import { CtaButton } from "@/components/ui/CtaButton";
import { Label, Reveal } from "@/components/ui/Reveal";
import { REACTIONS, type Reaction } from "@/lib/mock/reactions";
import { DURATION, EASE_OUT } from "@/lib/motion";
import { compactCount } from "@/lib/utils";

/**
 * What people say.
 *
 * Two rails moving in opposite directions at slightly different speeds, so the
 * section reads as a feed with something always in motion rather than a row of
 * quotes. Hovering a card stops the rail under the cursor so it can be read.
 */
export function Reactions() {
  const half = Math.ceil(REACTIONS.length / 2);
  const top = REACTIONS.slice(0, half);
  const bottom = REACTIONS.slice(half);

  return (
    <section className="relative overflow-hidden py-20 sm:py-28">
      <div className="gutter">
        <div className="max-w-xl">
          <Reveal>
            <Label accent>Reactions</Label>
          </Reveal>
          <Reveal delay={0.08}>
            <h2 className="mt-6 text-display">What people say afterwards.</h2>
          </Reveal>
        </div>
      </div>

      <div className="mt-12 flex flex-col gap-4 sm:mt-14">
        <Marquee speed={30} label="Reactions to Blink">
          {top.map((item) => (
            <ReactionCard key={item.handle} reaction={item} />
          ))}
        </Marquee>
        <Marquee speed={22} direction="right" label="More reactions to Blink">
          {bottom.map((item) => (
            <ReactionCard key={item.handle} reaction={item} />
          ))}
        </Marquee>
      </div>

      <div className="gutter mt-12 flex justify-center sm:mt-14">
        <Reveal>
          <CtaButton label="Analyze my profile" />
        </Reveal>
      </div>
    </section>
  );
}

function ReactionCard({ reaction }: { reaction: Reaction }) {
  return (
    <motion.article
      className="flex w-[19rem] shrink-0 flex-col rounded-panel bg-white p-5 shadow-rest ring-1 ring-edge sm:w-[21rem]"
      whileHover={{ y: -3 }}
      transition={{ duration: DURATION.tap, ease: EASE_OUT }}
    >
      <div className="flex items-center gap-3">
        <PersonAvatar tint={reaction.tint} size={38} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <span className="truncate text-[0.875rem] font-semibold tracking-[-0.012em]">
              {reaction.name ?? reaction.handle}
            </span>
            {reaction.verified ? (
              <IconVerified className="h-3.5 w-3.5 shrink-0 text-accent" />
            ) : null}
          </div>
          <p className="truncate text-[0.75rem] text-ink-4">
            {reaction.name ? reaction.handle : `${reaction.when} ago`}
          </p>
        </div>
      </div>

      <p className="mb-4 mt-3.5 text-[0.9375rem] leading-[1.55] text-ink-2">{reaction.body}</p>

      <div className="mt-auto flex items-center gap-4 border-t border-edge pt-3.5 text-[0.75rem] text-ink-4">
        <span className="inline-flex items-center gap-1.5">
          <IconHeart className="h-3.5 w-3.5 text-low" />
          <span className="tabular">{compactCount(reaction.likes)}</span>
        </span>
        {reaction.name ? <span>{reaction.when} ago</span> : null}
      </div>
    </motion.article>
  );
}
