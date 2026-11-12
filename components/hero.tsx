"use client";

import { motion } from "framer-motion";
import { ArrowDown } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

/**
 * Hero section with a massive headline, subtitle, and a blurred radial
 * background gradient. Animates in with Framer Motion fade-in + slide-up.
 */
export function Hero() {
  return (
    <section className="relative flex min-h-[80vh] flex-col items-center justify-center overflow-hidden px-6 text-center">
      {/* Subtle blurred radial gradient background */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        aria-hidden="true"
      >
        <div className="absolute left-1/2 top-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-cyan-500/10 blur-3xl sm:h-[600px] sm:w-[600px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <h1 className="max-w-4xl text-4xl font-bold tracking-tighter sm:text-6xl md:text-7xl lg:text-8xl">
          Pablo Di Meglio
        </h1>
        <p className="mt-4 text-lg text-zinc-300 sm:text-xl md:text-2xl">
          Lead Full Stack Engineer · AI Native
        </p>
        <p className="mt-6 max-w-xl mx-auto text-base text-zinc-400 leading-relaxed sm:text-lg">
          Building software that thinks.
        </p>
        <motion.a
          href="#building"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5, ease: "easeOut" }}
          onClick={() =>
            trackEvent({
              event: "nav_link_clicked",
              properties: { href: "#building", label: "Hero: what I'm building", from_page: "/" },
            })
          }
          className="group mt-10 inline-flex items-center gap-2 rounded-full border border-slate-800 bg-card/60 px-4 py-2 text-sm text-zinc-300 backdrop-blur transition-colors hover:border-slate-700 hover:text-white"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60 motion-reduce:animate-none" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          Now building Batcave and The Paddle Games
          <ArrowDown className="h-4 w-4 transition-transform group-hover:translate-y-0.5" />
        </motion.a>
      </motion.div>
    </section>
  );
}
