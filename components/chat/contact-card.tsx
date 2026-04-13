"use client";

import { Calendar, Mail } from "lucide-react";
import type { ContactCardProps } from "@/lib/chat-widgets";

interface Props extends ContactCardProps {
  /** Called when a button injects a message into the chat. */
  onAction: (message: string) => void;
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

export function ContactCard({ context, onAction }: Props) {
  return (
    <div className="mt-2 rounded-lg border border-slate-700/60 bg-black/30 p-3">
      <p className="mb-3 text-xs leading-relaxed text-slate-400">
        {context ?? "Here are the best ways to connect with Pablo:"}
      </p>

      <div className="flex flex-col gap-2">
        {/* Calendly — injects a message so the agent can guide the scheduling flow */}
        <button
          onClick={() =>
            onAction(
              "I'd like to schedule a call with Pablo to discuss an opportunity."
            )
          }
          className="flex items-center gap-2.5 rounded-md border border-slate-600/60 bg-slate-800/50 px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-slate-700/50 active:scale-[0.98] cursor-pointer"
        >
          <Calendar className="h-4 w-4 shrink-0" />
          <span className="font-medium">Schedule a call</span>
        </button>

        {/* Email — injects a message so the agent can help compose or direct */}
        <button
          onClick={() =>
            onAction(
              "I'd like to send Pablo an email to introduce myself and my company."
            )
          }
          className="flex items-center gap-2.5 rounded-md border border-slate-600/60 bg-slate-800/50 px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-slate-700/50 active:scale-[0.98] cursor-pointer"
        >
          <Mail className="h-4 w-4 shrink-0" />
          <span className="font-medium">Email Pablo</span>
        </button>

        {/* LinkedIn — external link (no useful API action to add here) */}
        <a
          href="https://linkedin.com/in/dimegliopablo"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 rounded-md border border-slate-600/60 bg-slate-800/50 px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-slate-700/50 cursor-pointer"
        >
          <LinkedInIcon className="h-4 w-4 shrink-0" />
          <span className="font-medium">LinkedIn</span>
        </a>
      </div>
    </div>
  );
}
