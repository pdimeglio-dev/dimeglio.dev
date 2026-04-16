"use client";

import { useState } from "react";
import { Mail, CheckCircle } from "lucide-react";
import type { ContactCardProps } from "@/lib/chat-widgets";
import { ContactForm } from "@/components/chat/contact-form";
import { trackEvent } from "@/lib/analytics";

interface Props extends ContactCardProps {
  /** Called when a button injects a message into the chat (kept for API compat). */
  onAction: (message: string) => void;
  conversationId?: string;
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

type CardState = "idle" | "form" | "sent";

export function ContactCard({ context, conversationId }: Props) {
  const [state, setState] = useState<CardState>("idle");

  return (
    <div className="mt-2 rounded-lg border border-slate-700/60 bg-black/30 p-3">
      <p className="mb-3 text-xs leading-relaxed text-slate-400">
        {context ?? "Here are the best ways to connect with Pablo:"}
      </p>

      <div className="flex flex-col gap-2">
        {/* Email Pablo — idle shows button, form shows inline form, sent shows nothing (form has its own success UI) */}
        {state === "idle" && (
          <button
            onClick={() => {
              trackEvent({
                event: "guillermo_cta_clicked",
                properties: { cta_type: "email", from_page: window.location.pathname, conversation_id: conversationId },
              });
              setState("form");
            }}
            className="flex items-center gap-2.5 rounded-md border border-slate-600/60 bg-slate-800/50 px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-slate-700/50 active:scale-[0.98] cursor-pointer"
          >
            <Mail className="h-4 w-4 shrink-0" />
            <span className="font-medium">Email Pablo</span>
          </button>
        )}

        {state === "form" && (
          <ContactForm onSuccess={() => setState("sent")} />
        )}

        {/* Success state */}
        {state === "sent" && (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-green-800/40 bg-green-950/20 px-3 py-4 text-center">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <p className="text-sm font-medium text-green-300">Message sent!</p>
            <p className="text-xs text-slate-400">
              Pablo will get back to you shortly. Check your inbox for a confirmation.
            </p>
          </div>
        )}

        {/* LinkedIn — always visible except when form is open */}
        {state !== "form" && (
          <a
            href="https://linkedin.com/in/dimegliopablo"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              trackEvent({
                event: "guillermo_cta_clicked",
                properties: { cta_type: "linkedin", from_page: window.location.pathname, conversation_id: conversationId },
              });
            }}
            className="flex items-center gap-2.5 rounded-md border border-slate-600/60 bg-slate-800/50 px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-slate-700/50 cursor-pointer"
          >
            <LinkedInIcon className="h-4 w-4 shrink-0" />
            <span className="font-medium">LinkedIn</span>
          </a>
        )}
      </div>
    </div>
  );
}
