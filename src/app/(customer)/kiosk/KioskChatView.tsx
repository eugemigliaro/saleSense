"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Send, X } from "lucide-react";
import { useEffect, useRef } from "react";

import type { ChatMessage } from "@/types/domain";

interface KioskChatViewProps {
  chatError: string | null;
  draft: string;
  isTyping: boolean;
  messages: ChatMessage[];
  productName: string;
  onDraftChange: (value: string) => void;
  onEndSession: () => void;
  onSendMessage: (content: string) => void | Promise<void>;
}

export function KioskChatView({
  chatError,
  draft,
  isTyping,
  messages,
  productName,
  onDraftChange,
  onEndSession,
  onSendMessage,
}: KioskChatViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      behavior: "smooth",
      top: scrollRef.current.scrollHeight,
    });
  }, [isTyping, messages]);

  return (
    <motion.div
      className="fixed inset-0 kiosk-bg flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="flex items-center justify-between border-b border-[hsl(222_30%_12%)] px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="h-3 w-3 animate-pulse rounded-full bg-primary" />
          <h2 className="kiosk-text font-display text-lg font-semibold">
            SaleSense — {productName}
          </h2>
        </div>
        <button
          onClick={onEndSession}
          className="kiosk-surface rounded-lg p-2 transition-opacity hover:opacity-80"
          type="button"
        >
          <X className="kiosk-muted h-5 w-5" />
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
        <AnimatePresence mode="popLayout">
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-5 py-3 text-[15px] leading-relaxed md:max-w-[60%] ${
                  message.role === "user"
                    ? "kiosk-gradient-bg text-primary-foreground"
                    : "kiosk-surface kiosk-text"
                }`}
              >
                {message.content}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isTyping ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="kiosk-surface flex items-center gap-1.5 rounded-2xl px-5 py-3">
              <span className="kiosk-muted h-2 w-2 animate-bounce rounded-full [animation-delay:0ms]" />
              <span className="kiosk-muted h-2 w-2 animate-bounce rounded-full [animation-delay:150ms]" />
              <span className="kiosk-muted h-2 w-2 animate-bounce rounded-full [animation-delay:300ms]" />
            </div>
          </motion.div>
        ) : null}
      </div>

      <div className="border-t border-[hsl(222_30%_12%)] px-6 py-4">
        <div className="mx-auto max-w-3xl">
          {chatError ? (
            <div className="mb-3 rounded-xl border border-amber-400/20 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
              {chatError}
            </div>
          ) : null}

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void onSendMessage(draft);
            }}
            className="flex items-center gap-3"
          >
            <input
              type="text"
              value={draft}
              onChange={(event) => onDraftChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void onSendMessage(draft);
                }
              }}
              placeholder="Type a message..."
              className="kiosk-surface kiosk-text placeholder:kiosk-muted flex-1 rounded-xl px-5 py-3.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <button
              type="submit"
              disabled={!draft.trim() || isTyping}
              className="kiosk-gradient-bg rounded-xl p-3.5 transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              <Send className="h-5 w-5 text-primary-foreground" />
            </button>
          </form>
        </div>
      </div>
    </motion.div>
  );
}
