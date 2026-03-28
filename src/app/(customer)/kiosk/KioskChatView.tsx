"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Bot,
  ExternalLink,
  MessageCircle,
  Search,
  Send,
  User,
  X,
} from "lucide-react";
import { useEffect, useRef } from "react";

import type { ChatMessageGrounding } from "@/types/api";
import type { ChatMessage } from "@/types/domain";

interface KioskChatViewProps {
  activeGrounding: ChatMessageGrounding | null;
  chatError: string | null;
  draft: string;
  groundingByMessageId: Record<string, ChatMessageGrounding>;
  idleMediaUrl: string | null;
  isTyping: boolean;
  messages: ChatMessage[];
  onCloseGrounding: () => void;
  productName: string;
  onDraftChange: (value: string) => void;
  onEndSession: () => void;
  onOpenGroundingForMessage: (messageId: string) => void;
  onSendMessage: (content: string) => void | Promise<void>;
}

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export function KioskChatView({
  activeGrounding,
  chatError,
  draft,
  groundingByMessageId,
  idleMediaUrl,
  isTyping,
  messages,
  onCloseGrounding,
  productName,
  onDraftChange,
  onEndSession,
  onOpenGroundingForMessage,
  onSendMessage,
}: KioskChatViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      behavior: "smooth",
      top: scrollRef.current.scrollHeight,
    });
  }, [isTyping, messages]);

  useEffect(() => {
    if (!textareaRef.current) {
      return;
    }

    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
  }, [draft]);

  function formatMessageTime(value: string) {
    try {
      return new Intl.DateTimeFormat("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(value));
    } catch {
      return "";
    }
  }

  return (
    <motion.div
      className="kiosk-bg fixed inset-0 flex flex-col overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0">
        {idleMediaUrl ? (
          <div
            aria-hidden="true"
            className="h-full w-full scale-110 bg-cover bg-center opacity-60 blur-xl"
            style={{ backgroundImage: `url(${idleMediaUrl})` }}
          />
        ) : (
          <div className="h-full w-full bg-[radial-gradient(circle_at_top,rgba(96,165,250,0.18),transparent_28%),linear-gradient(180deg,rgba(15,23,42,0.16),transparent)]" />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.7)_0%,rgba(2,6,23,0.62)_44%,rgba(2,6,23,0.82)_100%)]" />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-4 sm:px-6 lg:px-10">
        <div className="flex h-[min(92vh,920px)] w-full max-w-6xl flex-col overflow-hidden rounded-[2rem] border border-white/12 bg-slate-950/55 shadow-[0_40px_120px_-42px_rgba(2,6,23,0.95)] backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 sm:px-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 shadow-[0_20px_40px_-18px_rgba(59,130,246,0.95)]">
                <MessageCircle className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="kiosk-text font-display text-xl font-semibold sm:text-2xl">
                  Chat with SaleSense
                </h2>
                <div className="mt-1 flex items-center gap-2 text-sm text-white/60">
                  <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-400" />
                  <span>{productName}</span>
                  <span className="text-white/35">Online</span>
                </div>
              </div>
            </div>
            <button
              onClick={onEndSession}
              className="rounded-xl border border-white/10 bg-white/6 p-3 text-white/70 transition-all hover:bg-white/10 hover:text-white"
              type="button"
              aria-label="End chat session"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div
            ref={scrollRef}
            className="flex-1 space-y-5 overflow-y-auto px-5 py-6 sm:px-6"
          >
            <AnimatePresence mode="popLayout">
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {message.role === "assistant" ? (
                      <div className="mr-3 mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/8">
                        <Bot className="h-4.5 w-4.5 text-blue-300" />
                      </div>
                    ) : null}

                    <div
                      className={`max-w-[82%] rounded-3xl px-4 py-3 sm:max-w-[68%] sm:px-5 ${
                        message.role === "user"
                          ? "rounded-br-xl bg-gradient-to-r from-blue-500 to-violet-600 text-white shadow-[0_22px_45px_-26px_rgba(59,130,246,0.98)]"
                          : "rounded-bl-xl border border-white/10 bg-white/10 text-white/92 backdrop-blur-md"
                      }`}
                    >
                      <p className="break-words text-[15px] leading-7">
                        {message.content}
                      </p>
                      <p className="mt-2 text-xs text-white/45">
                        {formatMessageTime(message.createdAt)}
                      </p>
                    </div>

                    {message.role === "user" ? (
                      <div className="ml-3 mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-violet-600">
                        <User className="h-4.5 w-4.5 text-white" />
                      </div>
                    ) : null}
                  </div>

                  {message.role === "assistant" &&
                  groundingByMessageId[message.id]?.sources.length ? (
                    <div className="mt-2 flex justify-start pl-12">
                      <button
                        type="button"
                        onClick={() => onOpenGroundingForMessage(message.id)}
                        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80 transition-colors hover:border-primary/40 hover:text-white"
                      >
                        <Search className="h-3.5 w-3.5" />
                        View sources
                      </button>
                    </div>
                  ) : null}
                </motion.div>
              ))}
            </AnimatePresence>

            {isTyping ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-start"
              >
                <div className="mr-3 mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/8">
                  <Bot className="h-4.5 w-4.5 text-blue-300" />
                </div>
                <div className="flex items-center gap-1.5 rounded-3xl rounded-bl-xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur-md">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-white/50 [animation-delay:0ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-white/50 [animation-delay:120ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-white/50 [animation-delay:240ms]" />
                </div>
              </motion.div>
            ) : null}
          </div>

          <div className="border-t border-white/10 px-5 py-4 sm:px-6">
            <div className="mx-auto max-w-4xl">
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
                className="flex items-end gap-3"
              >
                <div className="relative flex-1">
                  <textarea
                    ref={textareaRef}
                    value={draft}
                    onChange={(event) => onDraftChange(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        void onSendMessage(draft);
                      }
                    }}
                    placeholder="Type your message..."
                    rows={1}
                    className="min-h-12 max-h-32 w-full resize-none overflow-y-auto rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-[15px] leading-6 text-white placeholder:text-white/35 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-blue-400/50"
                  />
                  {draft.length > 0 ? (
                    <div className="absolute bottom-2 right-3 text-xs text-white/35">
                      {draft.length}
                    </div>
                  ) : null}
                </div>

                <button
                  type="submit"
                  disabled={!draft.trim() || isTyping}
                  className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-r from-blue-500 to-violet-600 text-white shadow-[0_22px_40px_-24px_rgba(59,130,246,0.95)] transition-all hover:scale-[1.02] hover:from-blue-600 hover:to-violet-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
                  aria-label="Send message"
                >
                  <Send className="h-5 w-5" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {activeGrounding ? (
          <motion.aside
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24 }}
            className="absolute right-4 top-20 z-20 w-[min(28rem,calc(100vw-2rem))] rounded-2xl border border-white/10 bg-[rgba(11,14,25,0.96)] p-5 shadow-2xl backdrop-blur"
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.24em] text-primary/80">
                  Grounding
                </p>
                <h3 className="mt-1 font-display text-lg font-semibold text-white">
                  External sources
                </h3>
              </div>
              <button
                type="button"
                onClick={onCloseGrounding}
                className="rounded-lg border border-white/10 p-2 text-white/70 transition-colors hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {activeGrounding.searchEntryPointRenderedContent ? (
              <p className="mb-4 text-sm leading-relaxed text-white/70">
                {stripHtml(activeGrounding.searchEntryPointRenderedContent)}
              </p>
            ) : null}

            <div className="space-y-3">
              {activeGrounding.sources.map((source) => (
                <a
                  key={`${source.url}-${source.title}`}
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-xl border border-white/10 bg-white/5 px-4 py-3 transition-colors hover:border-primary/40 hover:bg-white/8"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-white">{source.title}</p>
                      <p className="mt-1 text-xs text-white/55">{source.host}</p>
                    </div>
                    <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-white/45" />
                  </div>
                </a>
              ))}
            </div>
          </motion.aside>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}
