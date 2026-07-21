"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

type AnimatedHeroHeadlineProps = {
  lead: string;
  phrases: readonly string[];
  className?: string;
  phraseClassName?: string;
  intervalMs?: number;
};

// Motion pattern adapted from Tommy Jepsen's MIT-licensed Animated Hero
// component and its TWBlocks Hero5 source.
export function AnimatedHeroHeadline({
  lead,
  phrases,
  className,
  phraseClassName,
  intervalMs = 2400,
}: AnimatedHeroHeadlineProps) {
  const reduceMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (reduceMotion || phrases.length < 2) return;

    const timeout = window.setTimeout(() => {
      setActiveIndex((current) => (current + 1) % phrases.length);
    }, intervalMs);

    return () => window.clearTimeout(timeout);
  }, [activeIndex, intervalMs, phrases.length, reduceMotion]);

  if (phrases.length === 0) {
    return <h1 className={className}>{lead}</h1>;
  }

  const accessibleHeadline = `${lead} ${phrases[0]}`;

  return (
    <h1 className={className} aria-label={accessibleHeadline}>
      <span aria-hidden="true" className="block">
        {lead}
      </span>
      <span
        aria-hidden="true"
        className={`relative grid min-w-0 overflow-hidden pb-[0.08em] ${phraseClassName ?? ""}`}
      >
        {phrases.map((phrase, index) => {
          const isActive = index === activeIndex;
          const offset = reduceMotion ? 0 : activeIndex > index ? "-0.55em" : "0.55em";

          return (
            <motion.span
              key={phrase}
              className="will-change-transform [grid-area:1/1]"
              initial={false}
              animate={{
                opacity: isActive ? 1 : 0,
                y: isActive ? "0%" : offset,
              }}
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : {
                      y: { type: "spring", stiffness: 105, damping: 18, mass: 0.75 },
                      opacity: { duration: 0.16, ease: "easeOut" },
                    }
              }
            >
              {phrase}
            </motion.span>
          );
        })}
      </span>
    </h1>
  );
}
