"use client";

import { motion } from "framer-motion";
import { Bot } from "lucide-react";

/**
 * Floating AI Agent orb button — positioned in the bottom-right corner.
 * Placeholder for a future AI-powered assistant/chat feature.
 * Has a subtle pulsing glow animation.
 */
export function AIOrb() {
  return (
    <motion.button
      className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full border border-slate-800 bg-black shadow-lg shadow-purple-500/10 transition-colors hover:border-slate-600 hover:shadow-purple-500/20"
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 1, duration: 0.5 }}
      aria-label="AI Assistant (coming soon)"
      title="AI Assistant — Coming Soon"
    >
      <Bot className="h-6 w-6 text-purple-400" />
      {/* Pulsing glow ring */}
      <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-purple-500/10" />
    </motion.button>
  );
}
