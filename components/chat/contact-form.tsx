"use client";

import { useState } from "react";
import { Send, CheckCircle, AlertCircle, Loader2, Mail } from "lucide-react";
import { trackEvent, captureError } from "@/lib/analytics";

interface ContactFormProps {
  onSuccess?: () => void;
}

type Status = "idle" | "submitting" | "success" | "fallback" | "error";

export function ContactForm({ onSuccess }: ContactFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === "submitting") return;

    setStatus("submitting");
    setErrorMessage("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, company, message }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error ?? "Something went wrong. Please try again.");
        setStatus("error");
        return;
      }

      trackEvent({
        event: "contact_form_submitted",
        properties: {
          has_company: !!company.trim(),
          has_message: !!message.trim(),
        },
      });

      if (data.fallback) {
        setStatus("fallback");
        return;
      }

      setStatus("success");
      onSuccess?.();
    } catch (error) {
      captureError(error);
      setErrorMessage("Network error. Please try again.");
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div className="mt-2 flex flex-col items-center gap-2 rounded-lg border border-green-800/40 bg-green-950/20 p-4 text-center">
        <CheckCircle className="h-6 w-6 text-green-400" />
        <p className="text-sm font-medium text-green-300">Message sent!</p>
        <p className="text-xs text-slate-400">
          Pablo will get back to you shortly. Check your inbox for a confirmation.
        </p>
      </div>
    );
  }

  if (status === "fallback") {
    const subject = encodeURIComponent("Hi Pablo — reaching out via dimeglio.dev");
    const body = encodeURIComponent(
      [
        name && `Name: ${name}`,
        company && `Company: ${company}`,
        message && `\n${message}`,
      ]
        .filter(Boolean)
        .join("\n")
    );
    const mailto = `mailto:dimeglio.pablo@gmail.com?subject=${subject}&body=${body}`;

    return (
      <div className="mt-2 flex flex-col gap-3 rounded-lg border border-amber-800/40 bg-amber-950/20 p-4">
        <div className="flex items-start gap-2">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <p className="text-xs text-amber-300 leading-relaxed">
            Couldn&apos;t send automatically — click below to email Pablo directly.
            Your message will be pre-filled.
          </p>
        </div>
        <a
          href={mailto}
          className="flex items-center justify-center gap-2 rounded-md border border-amber-700/50 bg-amber-900/30 px-3 py-2 text-sm font-medium text-amber-200 transition-colors hover:bg-amber-800/40"
        >
          <Mail className="h-4 w-4 shrink-0" />
          dimeglio.pablo@gmail.com
        </a>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-2 flex flex-col gap-2.5 rounded-lg border border-slate-700/60 bg-black/30 p-3"
    >
      <p className="text-xs text-slate-400">
        Drop your details and Pablo will reach out directly.
      </p>

      {/* Name */}
      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          Name <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Jane Smith"
          required
          className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-200 placeholder:text-slate-600 focus:border-purple-500/60 focus:outline-none focus:ring-1 focus:ring-purple-500/30"
        />
      </div>

      {/* Email */}
      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          Email <span className="text-red-400">*</span>
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="jane@company.com"
          required
          className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-200 placeholder:text-slate-600 focus:border-purple-500/60 focus:outline-none focus:ring-1 focus:ring-purple-500/30"
        />
      </div>

      {/* Company (optional) */}
      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          Company <span className="text-slate-600">(optional)</span>
        </label>
        <input
          type="text"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          placeholder="Acme Corp"
          className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-200 placeholder:text-slate-600 focus:border-purple-500/60 focus:outline-none focus:ring-1 focus:ring-purple-500/30"
        />
      </div>

      {/* Message (optional) */}
      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          Message <span className="text-slate-600">(optional)</span>
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Tell Pablo a bit about the role or opportunity..."
          rows={3}
          className="resize-none rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-200 placeholder:text-slate-600 focus:border-purple-500/60 focus:outline-none focus:ring-1 focus:ring-purple-500/30"
        />
      </div>

      {/* Error */}
      {status === "error" && (
        <div className="flex items-center gap-2 rounded-md border border-red-800/40 bg-red-950/20 px-3 py-2">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-400" />
          <p className="text-xs text-red-300">{errorMessage}</p>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={status === "submitting"}
        className="flex items-center justify-center gap-2 rounded-md bg-purple-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === "submitting" ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Sending…
          </>
        ) : (
          <>
            <Send className="h-4 w-4" />
            Send message
          </>
        )}
      </button>
    </form>
  );
}
