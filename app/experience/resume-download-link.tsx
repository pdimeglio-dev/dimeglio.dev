"use client";

import { FileDown } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

/**
 * Client component for the resume download CTA on the experience page.
 * Needs "use client" for the onClick analytics tracking.
 */
export function ResumeDownloadLink() {
  return (
    <div className="mt-6 flex items-center gap-2 text-sm text-zinc-400">
      <span>Looking for a focused summary?</span>
      <a
        href="/pablo-di-meglio-resume.pdf"
        target="_blank"
        rel="noopener noreferrer"
        download
        className="inline-flex items-center gap-1.5 text-white underline underline-offset-4 decoration-slate-600 transition-colors hover:decoration-white"
        onClick={() =>
          trackEvent({
            event: "resume_downloaded",
            properties: {},
          })
        }
      >
        <FileDown className="h-3.5 w-3.5" />
        Download Full Resume (PDF)
      </a>
    </div>
  );
}
