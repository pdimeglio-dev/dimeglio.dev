"use client";

import { cn } from "@/lib/utils";
import React, { useEffect, useRef, useState } from "react";

/**
 * Aceternity-style infinite horizontal scroller for skill pills.
 * Based on the InfiniteMovingCards pattern but renders minimalistic
 * dark-mode pill badges instead of testimonial cards.
 */
export function InfiniteMovingSkills({
  items,
  direction = "left",
  speed = "normal",
  pauseOnHover = true,
  className,
}: {
  items: { name: string }[];
  direction?: "left" | "right";
  speed?: "fast" | "normal" | "slow";
  pauseOnHover?: boolean;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLUListElement>(null);
  const [start, setStart] = useState(false);

  useEffect(() => {
    if (containerRef.current && scrollerRef.current) {
      const scrollerContent = Array.from(scrollerRef.current.children);

      scrollerContent.forEach((item) => {
        const duplicatedItem = item.cloneNode(true);
        if (scrollerRef.current) {
          scrollerRef.current.appendChild(duplicatedItem);
        }
      });

      // Set CSS custom properties for direction & speed
      if (containerRef.current) {
        containerRef.current.style.setProperty(
          "--animation-direction",
          direction === "left" ? "forwards" : "reverse",
        );

        const durations = { fast: "20s", normal: "40s", slow: "80s" };
        containerRef.current.style.setProperty(
          "--animation-duration",
          durations[speed],
        );
      }

      setStart(true);
    }
  }, [direction, speed]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "scroller relative z-20 max-w-7xl overflow-hidden [mask-image:linear-gradient(to_right,transparent,white_20%,white_80%,transparent)]",
        className,
      )}
    >
      <ul
        ref={scrollerRef}
        className={cn(
          "flex w-max min-w-full shrink-0 flex-nowrap gap-3 py-4",
          start && "animate-scroll",
          pauseOnHover && "hover:[animation-play-state:paused]",
        )}
      >
        {items.map((item) => (
          <li
            key={item.name}
            className="shrink-0 rounded-full border border-slate-700 bg-slate-800/50 px-4 py-1.5 text-xs font-medium text-neutral-300 transition-colors hover:border-slate-600 hover:text-white"
          >
            {item.name}
          </li>
        ))}
      </ul>
    </div>
  );
}
