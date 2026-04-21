"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Maximize2, Minimize2, Send, Bot, User, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Link from "next/link";
import { SkillGrid } from "@/components/chat/skill-grid";
import { ContactCard } from "@/components/chat/contact-card";
import { ProjectCard } from "@/components/chat/project-card";
import { ProjectList } from "@/components/chat/project-list";
import { BlogPostCard } from "@/components/chat/blog-post-card";
import { AvailabilityPicker } from "@/components/chat/availability-picker";
import { trackEvent, captureError } from "@/lib/analytics";
import type {
  GuillermoChunk,
  ContentBlock,
} from "@/lib/chat-widgets";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Message {
  id: string;
  role: "user" | "assistant";
  /** Accumulated raw text — used for localStorage serialisation and fallback rendering */
  content: string;
  /** Ordered content blocks (text segments + widgets) — the new rendering source */
  blocks: ContentBlock[];
}

interface ChatInterfaceProps {
  isOpen: boolean;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Markdown component config (reused for every text block)
// ---------------------------------------------------------------------------

const MD_COMPONENTS: React.ComponentProps<typeof ReactMarkdown>["components"] = {
  p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
  em: ({ children }) => <em className="italic text-slate-300">{children}</em>,
  ul: ({ children }) => <ul className="mb-2 ml-4 list-disc list-outside space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="mb-2 ml-4 list-decimal list-outside space-y-1">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  a: ({ href, children }) => {
    // Use Next.js client-side navigation for internal dimeglio.dev links
    const isInternal =
      href?.startsWith("/") ||
      href?.startsWith("https://dimeglio.dev") ||
      href?.startsWith("http://dimeglio.dev");
    const cls = "text-purple-400 no-underline transition-colors hover:text-purple-300";
    if (isInternal && href) {
      const path = href.replace(/^https?:\/\/dimeglio\.dev/, "");
      return (
        <Link href={path} className={cls}>
          {children}
        </Link>
      );
    }
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={cls}
      >
        {children}
      </a>
    );
  },
  code: ({ children, className }) => {
    const isBlock = className?.startsWith("language-");
    return isBlock ? (
      <pre className="my-2 overflow-x-auto rounded border border-slate-700 bg-black/50 p-2">
        <code className="font-mono text-xs text-purple-300">{children}</code>
      </pre>
    ) : (
      <code className="rounded bg-black/40 px-1 py-0.5 font-mono text-xs text-purple-300">
        {children}
      </code>
    );
  },
  blockquote: ({ children }) => (
    <blockquote className="my-2 border-l-2 border-purple-500 pl-3 italic text-slate-400">
      {children}
    </blockquote>
  ),
  h1: ({ children }) => <h1 className="mb-1 text-base font-bold text-white">{children}</h1>,
  h2: ({ children }) => <h2 className="mb-1 text-sm font-semibold text-white">{children}</h2>,
  h3: ({ children }) => <h3 className="mb-1 text-sm font-medium text-slate-200">{children}</h3>,
  hr: () => <hr className="my-2 border-slate-700" />,
  table: ({ children }) => (
    <div className="my-3 overflow-x-auto">
      <table className="w-full border-collapse text-xs">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="border-b border-slate-600">{children}</thead>,
  tbody: ({ children }) => <tbody className="divide-y divide-slate-800">{children}</tbody>,
  tr: ({ children }) => <tr>{children}</tr>,
  th: ({ children }) => (
    <th className="px-3 py-2 text-left font-semibold text-white whitespace-nowrap">{children}</th>
  ),
  td: ({ children }) => (
    <td className="px-3 py-2 align-top text-slate-300">{children}</td>
  ),
  // Suppress images — the AI hallucinates logo paths that don't resolve correctly.
  // Images in the chat have no reliable source of truth, so we hide them entirely.
  img: () => null,
};

// ---------------------------------------------------------------------------
// Block renderer — maps a ContentBlock to JSX
// ---------------------------------------------------------------------------

function BlockRenderer({
  block,
  index,
  onAction,
  conversationId,
}: {
  block: ContentBlock;
  index: number;
  onAction: (message: string) => void;
  conversationId?: string;
}) {
  if (block.type === "text") {
    const cleaned = block.content.replace(/<!--[\s\S]*?(?:-->|$)/g, "");
    if (!cleaned.trim()) return null;
    return (
      <ReactMarkdown key={index} remarkPlugins={[remarkGfm]} components={MD_COMPONENTS}>
        {cleaned}
      </ReactMarkdown>
    );
  }

  if (block.type === "widget") {
    switch (block.component) {
      case "SkillGrid":
        return <SkillGrid key={index} {...block.props} />;
      case "ContactCard":
        return <ContactCard key={index} {...block.props} onAction={onAction} conversationId={conversationId} />;
      case "ProjectCard":
        return <ProjectCard key={index} {...block.props} />;
      case "ProjectList":
        return <ProjectList key={index} {...block.props} />;
      case "BlogPostCard":
        return <BlogPostCard key={index} {...block.props} />;
      case "AvailabilityPicker":
        return <AvailabilityPicker key={index} {...block.props} />;
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// LocalStorage persistence
// ---------------------------------------------------------------------------

const STORAGE_KEY = "guillermo-chat-session";

interface StoredSession {
  conversationId: string;
  messages: Message[];
}

function loadSession(): StoredSession {
  const fallback: StoredSession = {
    conversationId: crypto.randomUUID(),
    messages: [],
  };
  if (typeof window === "undefined") return fallback;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return fallback;
    const parsed = JSON.parse(saved);
    // Backward-compat: old format stored Message[] directly
    const raw: StoredSession = Array.isArray(parsed)
      ? { conversationId: crypto.randomUUID(), messages: parsed }
      : parsed;
    // Backfill `blocks` for messages saved before the ContentBlock era
    raw.messages = raw.messages.map((m) => ({
      ...m,
      blocks: m.blocks?.length
        ? m.blocks
        : m.content
        ? [{ type: "text" as const, content: m.content }]
        : [],
    }));
    return raw;
  } catch {
    return fallback;
  }
}

function saveSession(conversationId: string, messages: Message[]) {
  try {
    const session: StoredSession = { conversationId, messages };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Quota exceeded or private mode — silently ignore
  }
}

// ---------------------------------------------------------------------------
// ChatInterface component
// ---------------------------------------------------------------------------

export function ChatInterface({ isOpen, onClose }: ChatInterfaceProps) {
  const [isMaximized, setIsMaximized] = useState(false);
  const [initialSession] = useState(loadSession);
  const [messages, setMessages] = useState<Message[]>(initialSession.messages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const conversationIdRef = useRef(initialSession.conversationId);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Each request gets a monotonically-increasing ID so the `finally` block of an
  // older request doesn't reset `isLoading` after a newer one has already started.
  const requestIdRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Persist messages on every change
  useEffect(() => {
    saveSession(conversationIdRef.current, messages);
  }, [messages]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Refocus input after agent finishes responding
  const prevIsLoadingRef = useRef(false);
  useEffect(() => {
    if (prevIsLoadingRef.current && !isLoading) {
      inputRef.current?.focus();
    }
    prevIsLoadingRef.current = isLoading;
  }, [isLoading]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 100);
  }, [isOpen]);

  // ---------------------------------------------------------------------------
  // Submit handler — also used by ContactCard onAction button
  // ---------------------------------------------------------------------------

  const handleSubmitText = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;

      // Cancel any previous in-flight request and claim a new request ID.
      abortControllerRef.current?.abort();
      const ac = new AbortController();
      abortControllerRef.current = ac;
      const requestId = ++requestIdRef.current;

      const userMessage: Message = {
        id: Date.now().toString(),
        role: "user",
        content: text.trim(),
        blocks: [{ type: "text", content: text.trim() }],
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      trackEvent({
        event: "guillermo_message_sent",
        properties: {
          message_length: text.length,
          message_count: messages.length + 1,
          conversation_id: conversationIdRef.current,
        },
      });

      // Create the assistant message placeholder
      const assistantId = (Date.now() + 1).toString();
      const assistantMessage: Message = {
        id: assistantId,
        role: "assistant",
        content: "",
        blocks: [],
      };
      setMessages((prev) => [...prev, assistantMessage]);

      try {
        const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId: conversationIdRef.current,
            timezone: detectedTimezone,
            messages: [...messages, userMessage].map((m) => {
              if (m.role !== "assistant") return { role: m.role, content: m.content };
              const hasWidget = m.blocks.some((b) => b.type === "widget");
              if (hasWidget) {
                // Strip the intro text entirely for widget responses.
                // Keeping phrases like "Pablo worked on two notable projects for Disney"
                // causes the model to anchor on the previous company/topic and reuse
                // it instead of searching fresh. Replace with a neutral comment only.
                return {
                  role: m.role,
                  content: "<!-- widget_shown: tool data unavailable, must call searchPortfolio fresh -->",
                };
              }
              // For text-only responses, keep the content but remind the model to search.
              return {
                role: m.role,
                content: (m.content || "") +
                  "\n<!-- reminder: must call searchPortfolio fresh for any project or skill question -->",
              };
            }),
          }),
          signal: ac.signal,
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          // Split on newlines — each complete line is one NDJSON chunk
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? ""; // keep any incomplete last line in buffer

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            let chunk: GuillermoChunk;
            try {
              chunk = JSON.parse(trimmed) as GuillermoChunk;
            } catch {
              continue; // ignore malformed lines
            }

            if (chunk.type === "text") {
              setMessages((prev) =>
                prev.map((m) => {
                  if (m.id !== assistantId) return m;
                  const lastBlock = m.blocks[m.blocks.length - 1];
                  const delta = chunk.delta;
                  const newContent = m.content + delta;

                  if (lastBlock?.type === "text") {
                    // Append delta to the last text block
                    return {
                      ...m,
                      content: newContent,
                      blocks: [
                        ...m.blocks.slice(0, -1),
                        { type: "text" as const, content: lastBlock.content + delta },
                      ],
                    };
                  } else {
                    // Start a new text block after a widget
                    return {
                      ...m,
                      content: newContent,
                      blocks: [...m.blocks, { type: "text" as const, content: delta }],
                    };
                  }
                })
              );
            } else if (chunk.type === "widget") {
              setMessages((prev) =>
                prev.map((m) => {
                  if (m.id !== assistantId) return m;
                  return {
                    ...m,
                    blocks: [
                      ...m.blocks,
                      {
                        type: "widget" as const,
                        component: chunk.component,
                        props: chunk.props,
                      } as ContentBlock,
                    ],
                  };
                })
              );
            } else if (chunk.type === "thinking") {
              // no-op — dots are now driven purely by isLoading + blocks.length > 0
            } else if (chunk.type === "done") {
              // Server finished — unlock the input right away instead of waiting
              // for the TCP stream's EOF (avoids ~100–500ms of dead time).
              if (requestId === requestIdRef.current) {
                setIsLoading(false);
              }
              break;
            } else if (chunk.type === "widget-append" && chunk.component === "ProjectList") {
              setMessages((prev) =>
                prev.map((m) => {
                  if (m.id !== assistantId) return m;
                  const blocks = [...m.blocks];
                  for (let i = blocks.length - 1; i >= 0; i--) {
                    const block = blocks[i];
                    if (block.type === "widget" && block.component === "ProjectList") {
                      blocks[i] = {
                        ...block,
                        props: {
                          ...block.props,
                          items: [...block.props.items, ...chunk.items],
                        },
                      };
                      break;
                    }
                  }
                  return { ...m, blocks };
                })
              );
            }
          }
        }
      } catch (error) {
        if (ac.signal.aborted) return; // superseded by a newer request — silently drop
        console.error("[Chat] Error:", error);
        captureError(error);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content:
                    "I encountered an error. Please try again or contact Pablo directly.",
                  blocks: [
                    {
                      type: "text",
                      content:
                        "I encountered an error. Please try again or contact Pablo directly.",
                    },
                  ],
                }
              : m
          )
        );
      } finally {
        // Only reset loading state if this is still the active request.
        // Without this guard, an old stream's finally can clobber a newer request.
        if (requestId === requestIdRef.current) {
          setIsLoading(false);
        }
      }
    },
    [isLoading, messages]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    setInput("");
    await handleSubmitText(text);
  };

  const handleClearChat = useCallback(() => {
    setMessages([]);
    conversationIdRef.current = crypto.randomUUID();
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  }, []);

  const handleClose = () => {
    trackEvent({
      event: "guillermo_chat_closed",
      properties: {
        message_count: messages.length,
        conversation_id: conversationIdRef.current,
      },
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: 20 }}
        transition={{ duration: 0.2 }}
        className={`fixed z-50 top-0 left-0 h-[100dvh] w-screen ${
          isMaximized
            ? "md:inset-8 md:h-auto md:w-auto"
            : "md:inset-auto md:top-auto md:left-auto md:bottom-4 md:right-4 md:w-96 md:h-[560px]"
        } flex flex-col rounded-none md:rounded-lg border border-slate-800 bg-black/90 shadow-2xl backdrop-blur-md`}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between border-b border-slate-800 p-4">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Bot className="h-5 w-5 text-purple-400" />
              <span className="absolute -right-1 -top-1 h-3 w-3 animate-pulse rounded-full bg-purple-500" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-white">Guillermo</h3>
              <p className="text-xs text-slate-400">Pablo&apos;s AI Agent</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button
                onClick={handleClearChat}
                className="rounded-md p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-red-400"
                aria-label="Clear chat"
                title="Clear conversation"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={() => setIsMaximized((v) => !v)}
              className="hidden md:inline-flex rounded-md p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
              aria-label={isMaximized ? "Minimize" : "Maximize"}
            >
              {isMaximized ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </button>
            <button
              onClick={handleClose}
              className="rounded-md p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
              aria-label="Close chat"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ── Messages ── */}
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {messages.length === 0 && (
            <div className="py-8 text-center">
              <Bot className="mx-auto mb-3 h-12 w-12 text-purple-400" />
              <p className="font-medium text-slate-300">Hi! I&apos;m Guillermo</p>
              <p className="mt-1 text-sm text-slate-500">
                Ask me anything about Pablo&apos;s career, skills, or experience.
              </p>
            </div>
          )}

          {messages.map((message, msgIndex) => {
            const isLastMessage = msgIndex === messages.length - 1;
            // Dots inside empty bubble — waiting for first chunk
            const showLoader = isLastMessage && isLoading && message.role === "assistant" && message.blocks.length === 0;
            // Dots below content — show any time the stream is still open and content exists.
            // Using isLoading (not isAppending) so dots appear the moment the intro text
            // lands and stay until the stream closes, with no gap between text and tool call.
            const showAppendLoader = isLastMessage && isLoading && message.role === "assistant" && message.blocks.length > 0;

            return (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {message.role === "assistant" && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-500/20">
                    <Bot className="h-4 w-4 text-purple-400" />
                  </div>
                )}

                {/* Only render the bubble if there's content or we're showing the loader */}
                {(message.blocks.length > 0 || showLoader) && (
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                      message.role === "user"
                        ? "ml-auto bg-white text-black"
                        : "bg-slate-800 text-white"
                    }`}
                  >
                    {message.role === "user" ? (
                      <div className="whitespace-pre-wrap">{message.content}</div>
                    ) : showLoader ? (
                      /* Dot loader — shown while waiting for first chunk */
                      <div className="flex items-center gap-1 py-0.5">
                        {[0, 1, 2].map((i) => (
                          <motion.div
                            key={i}
                            className="h-1.5 w-1.5 rounded-full bg-purple-400"
                            animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1, 0.8] }}
                            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2, ease: "easeInOut" }}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-5">
                        {message.blocks.map((block, i) => (
                          <BlockRenderer
                            key={i}
                            block={block}
                            index={i}
                            conversationId={conversationIdRef.current}
                            onAction={(msg) => {
                              setInput("");
                              handleSubmitText(msg);
                            }}
                          />
                        ))}
                        {showAppendLoader && (
                          <div className="mt-2 flex items-center gap-1">
                            {[0, 1, 2].map((i) => (
                              <motion.div
                                key={i}
                                className="h-1.5 w-1.5 rounded-full bg-purple-400"
                                animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1, 0.8] }}
                                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2, ease: "easeInOut" }}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {message.role === "user" && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-600">
                    <User className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>
            );
          })}

          <div ref={messagesEndRef} />
        </div>

        {/* ── Input ── */}
        <form onSubmit={handleSubmit} className="border-t border-slate-800 p-4">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about Pablo's experience…"
              disabled={isLoading}
              style={{ fontSize: "16px" }}
              className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white placeholder-slate-400 focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-400 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="flex items-center justify-center rounded-lg bg-purple-600 px-3 py-2 text-white transition-colors hover:bg-purple-700 disabled:bg-purple-800 disabled:opacity-50"
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </form>
      </motion.div>
    </AnimatePresence>
  );
}
