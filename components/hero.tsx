"use client";

import { motion } from "framer-motion";

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
        <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-cyan-500/10 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <h1 className="max-w-4xl text-6xl font-bold tracking-tighter sm:text-7xl lg:text-8xl">
          Pablo Di Meglio
        </h1>
        <p className="mt-4 text-xl text-zinc-300 sm:text-2xl">
          Senior Full Stack Engineer · AI Architect
        </p>
        <p className="mt-6 max-w-xl mx-auto text-lg text-zinc-400 leading-relaxed">
          Building software that thinks.
        </p>
      </motion.div>
    </section>
  );
}
