"use client";

import { motion } from "framer-motion";
import { Code2, Brain, Layers, Sparkles } from "lucide-react";

const bentoItems = [
  {
    title: "Full Stack Engineering",
    description: "Building end-to-end systems with TypeScript, React, and Node.js.",
    icon: Code2,
    className: "md:col-span-2",
  },
  {
    title: "AI Architecture",
    description: "Designing intelligent systems with LLMs, RAG pipelines, and multi-agent patterns.",
    icon: Brain,
    className: "md:col-span-1",
  },
  {
    title: "System Design",
    description: "Scalable architectures handling millions of requests.",
    icon: Layers,
    className: "md:col-span-1",
  },
  {
    title: "Open Source",
    description: "Contributing to tools that make developers more productive.",
    icon: Sparkles,
    className: "md:col-span-2",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

/**
 * Bento Box grid — a set of feature cards in a responsive grid layout.
 * Each card has an icon, title, and description with staggered animations.
 */
export function BentoGrid() {
  return (
    <section className="mx-auto max-w-6xl px-6 pb-24">
      <motion.div
        className="grid grid-cols-1 gap-4 md:grid-cols-3"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
      >
        {bentoItems.map((item) => (
          <motion.div
            key={item.title}
            variants={itemVariants}
            className={`group rounded-2xl border border-slate-800 bg-card p-6 transition-colors hover:border-slate-700 ${item.className}`}
          >
            <item.icon className="mb-4 h-8 w-8 text-muted-foreground transition-colors group-hover:text-white" />
            <h3 className="text-lg font-semibold tracking-tight">
              {item.title}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {item.description}
            </p>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
