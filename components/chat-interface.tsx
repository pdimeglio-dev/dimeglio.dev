"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Maximize2, Minimize2, Send, Bot, User } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { trackEvent } from "@/lib/analytics";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface ChatInterfaceProps {
  isOpen: boolean;
  onClose: () => void;
}

const STORAGE_KEY = "guillermo-chat-session";

export function ChatInterface({ isOpen, onClose }: ChatInterfaceProps) {
  const [isMaximized, setIsMaximized] = useState(false);
  const [messages, setMessages] = useState<Message[]>(() => {
    // Load persisted messages from localStorage on first render
    if (typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? (JSON.parse(saved) as Message[]) : [];
    } catch {
      return [];
    }
  });
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Persist messages to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // localStorage might be unavailable (private browsing, quota exceeded)
    }
  }, [messages]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    trackEvent({
      event: "guillermo_message_sent",
      properties: { 
        message_length: input.length,
        message_count: messages.length + 1
      }
    });

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "",
      };

      setMessages(prev => [...prev, assistantMessage]);

      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantMessage.id
              ? { ...m, content: m.content + chunk }
              : m
          )
        );
      }
    } catch (error) {
      console.error("[Chat] Error:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "I encountered an error processing your request. Please try again or contact Pablo directly.",
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when opening
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleClose = () => {
    trackEvent({
      event: "guillermo_chat_closed",
      properties: { message_count: messages.length }
    });
    onClose();
  };

  const toggleMaximize = () => {
    setIsMaximized(!isMaximized);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: 20 }}
        transition={{ duration: 0.2 }}
        className={`fixed z-50 ${
          isMaximized
            ? "inset-4 md:inset-8"
            : "bottom-4 right-4 w-96 h-[500px]"
        } bg-black/90 backdrop-blur-md border border-slate-800 rounded-lg shadow-2xl flex flex-col`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Bot className="h-5 w-5 text-purple-400" />
              {/* Pulsing indicator */}
              <span className="absolute -top-1 -right-1 h-3 w-3 bg-purple-500 rounded-full animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-white">Guillermo</h3>
              <p className="text-xs text-slate-400">Pablo's AI Agent</p>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <button
              onClick={toggleMaximize}
              className="p-2 text-slate-400 hover:text-white transition-colors rounded-md hover:bg-slate-800"
              aria-label={isMaximized ? "Minimize" : "Maximize"}
            >
              {isMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
            <button
              onClick={handleClose}
              className="p-2 text-slate-400 hover:text-white transition-colors rounded-md hover:bg-slate-800"
              aria-label="Close chat"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-8">
              <Bot className="h-12 w-12 text-purple-400 mx-auto mb-3" />
              <p className="text-slate-300 font-medium">Hi! I'm Guillermo</p>
              <p className="text-slate-500 text-sm mt-1">
                Ask me anything about Pablo's career, skills, or experience.
              </p>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {message.role === "assistant" && (
                <div className="flex-shrink-0 h-8 w-8 bg-purple-500/20 rounded-full flex items-center justify-center">
                  <Bot className="h-4 w-4 text-purple-400" />
                </div>
              )}
              
              <div
                className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                  message.role === "user"
                    ? "bg-white text-black ml-auto"
                    : "bg-slate-800 text-white"
                }`}
              >
                {message.role === "user" ? (
                  <div className="whitespace-pre-wrap">{message.content}</div>
                ) : (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
                      strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
                      em: ({ children }) => <em className="italic text-slate-300">{children}</em>,
                      ul: ({ children }) => <ul className="list-disc list-outside ml-4 mb-2 space-y-1">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal list-outside ml-4 mb-2 space-y-1">{children}</ol>,
                      li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                      a: ({ href, children }) => (
                        <a href={href} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 underline underline-offset-2 transition-colors">
                          {children}
                        </a>
                      ),
                      code: ({ children, className }) => {
                        const isBlock = className?.startsWith("language-");
                        return isBlock ? (
                          <pre className="bg-black/50 border border-slate-700 rounded p-2 my-2 overflow-x-auto">
                            <code className="text-xs text-purple-300 font-mono">{children}</code>
                          </pre>
                        ) : (
                          <code className="bg-black/40 text-purple-300 font-mono text-xs px-1 py-0.5 rounded">{children}</code>
                        );
                      },
                      blockquote: ({ children }) => (
                        <blockquote className="border-l-2 border-purple-500 pl-3 my-2 text-slate-400 italic">{children}</blockquote>
                      ),
                      h1: ({ children }) => <h1 className="text-base font-bold text-white mb-1">{children}</h1>,
                      h2: ({ children }) => <h2 className="text-sm font-semibold text-white mb-1">{children}</h2>,
                      h3: ({ children }) => <h3 className="text-sm font-medium text-slate-200 mb-1">{children}</h3>,
                      hr: () => <hr className="border-slate-700 my-2" />,
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                )}
              </div>

              {message.role === "user" && (
                <div className="flex-shrink-0 h-8 w-8 bg-slate-600 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-white" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3">
              <div className="flex-shrink-0 h-8 w-8 bg-purple-500/20 rounded-full flex items-center justify-center">
                <Bot className="h-4 w-4 text-purple-400" />
              </div>
              <div className="bg-slate-800 rounded-lg px-3 py-2 text-sm text-white">
                <div className="flex items-center gap-2">
                  <span>Thinking</span>
                  <div className="flex gap-1">
                    <div className="w-1 h-1 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-1 h-1 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-1 h-1 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="p-4 border-t border-slate-800">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              placeholder="Ask about Pablo's experience..."
              disabled={isLoading}
              className="flex-1 bg-slate-800 text-white placeholder-slate-400 rounded-lg px-3 py-2 text-sm border border-slate-700 focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-400 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 disabled:opacity-50 text-white rounded-lg px-3 py-2 transition-colors flex items-center justify-center"
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