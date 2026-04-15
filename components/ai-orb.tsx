"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Bot } from "lucide-react";
import { ChatInterface } from "./chat-interface";
import { trackEvent } from "@/lib/analytics";

/**
 * Floating AI Agent orb button — positioned in the bottom-right corner.
 * Opens/closes the chat interface when clicked.
 * Has a subtle pulsing glow animation.
 */
export function AIOrb() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const pathname = usePathname();

  const handleToggleChat = () => {
    if (!isChatOpen) {
      trackEvent({
        event: "guillermo_chat_opened",
        properties: { from_page: pathname }
      });
    }
    setIsChatOpen(!isChatOpen);
  };

  const handleCloseChat = () => {
    setIsChatOpen(false);
  };

  return (
    <>
      <motion.button
        onClick={handleToggleChat}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full border border-slate-800 bg-black shadow-lg shadow-purple-500/10 transition-colors hover:border-slate-600 hover:shadow-purple-500/20"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1, duration: 0.5 }}
        aria-label="Chat with Guillermo"
        title="Chat with Guillermo — Pablo's AI Agent"
      >
        <Bot className="h-6 w-6 text-purple-400" />
        {/* Pulsing glow ring */}
        <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-purple-500/10" />
        {/* Active indicator when chat is open */}
        {isChatOpen && (
          <span className="absolute -top-1 -right-1 h-4 w-4 bg-purple-500 rounded-full border-2 border-black" />
        )}
      </motion.button>

      <ChatInterface isOpen={isChatOpen} onClose={handleCloseChat} />
    </>
  );
}
