"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Bot,
  ExternalLink,
  Mic,
  MicOff,
  Search,
  Send,
  User,
  Volume2,
  X,
} from "lucide-react";
import { useEffect, useRef } from "react";

import type { ChatMessageGrounding } from "@/types/api";
import type { ChatMessage } from "@/types/domain";

import type { VoiceSessionState } from "./kioskTypes";

interface KioskChatViewProps {
  activeGrounding: ChatMessageGrounding | null;
  chatError: string | null;
  draft: string;
  groundingByMessageId: Record<string, ChatMessageGrounding>;
  idleMediaUrl: string | null;
  isAssistantSpeaking: boolean;
  isAwaitingReply: boolean;
  isVoiceAvailable: boolean;
  isVoiceRecording: boolean;
  messages: ChatMessage[];
  onCancelVoiceInput: () => void;
  onCloseGrounding: () => void;
  onDraftChange: (value: string) => void;
  onOpenGroundingForMessage: (messageId: string) => void;
  onSendMessage: (content: string) => void | Promise<void>;
  onVoicePrimaryAction: () => void | Promise<void>;
  voiceState: VoiceSessionState;
}

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

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

function getVoiceStatus(voiceState: VoiceSessionState) {
  switch (voiceState) {
    case "connecting":
      return {
        icon: Volume2,
        label: "Starting voice",
      };
    case "recording":
      return {
        icon: Mic,
        label: "Recording",
      };
    case "assistant-speaking":
      return {
        icon: Volume2,
        label: "Speaking aloud",
      };
    case "ready":
      return {
        icon: Mic,
        label: "Voice ready",
      };
    case "fallback":
      return {
        icon: MicOff,
        label: "Typed fallback",
      };
    default:
      return {
        icon: MicOff,
        label: "Voice idle",
      };
  }
}

function getComposerHint({
  draft,
  isAssistantSpeaking,
  isAwaitingReply,
  isVoiceAvailable,
  isVoiceRecording,
}: {
  draft: string;
  isAssistantSpeaking: boolean;
  isAwaitingReply: boolean;
  isVoiceAvailable: boolean;
  isVoiceRecording: boolean;
}) {
  if (isVoiceRecording) {
    return "Stop talking to send automatically, tap the mic to send now, or cancel to switch to text.";
  }

  if (isAssistantSpeaking) {
    return "The assistant is speaking now. You'll get the same answer in text.";
  }

  if (isAwaitingReply) {
    return "The assistant is preparing a reply.";
  }

  if (draft.trim().length > 0) {
    return "Press Enter to send, or Shift+Enter for a new line.";
  }

  if (isVoiceAvailable) {
    return "Voice is the default. Tap the mic to speak, or start typing instead.";
  }

  return "Type your message below.";
}

export function KioskChatView({
  activeGrounding,
  chatError,
  draft,
  groundingByMessageId,
  idleMediaUrl,
  isAssistantSpeaking,
  isAwaitingReply,
  isVoiceAvailable,
  isVoiceRecording,
  messages,
  onCancelVoiceInput,
  onCloseGrounding,
  onDraftChange,
  onOpenGroundingForMessage,
  onSendMessage,
  onVoicePrimaryAction,
  voiceState,
}: KioskChatViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const voiceStatus = getVoiceStatus(voiceState);
  const VoiceStatusIcon = voiceStatus.icon;
  const isSendMode = draft.trim().length > 0;
  const isComposerLocked = isAwaitingReply || isAssistantSpeaking;

  useEffect(() => {
    scrollRef.current?.scrollTo({
      behavior: "smooth",
      top: scrollRef.current.scrollHeight,
    });
  }, [isAssistantSpeaking, isAwaitingReply, isVoiceRecording, messages]);

  useEffect(() => {
    if (!textareaRef.current) {
      return;
    }

    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
  }, [draft]);

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

      <div className="relative z-10 flex min-h-screen justify-center px-4 py-6 sm:px-6 lg:px-10">
        <div className="flex h-full min-h-screen w-full max-w-5xl flex-col">
          <div
            ref={scrollRef}
            className="flex-1 space-y-5 overflow-y-auto px-1 pb-6 pt-8 sm:px-4 lg:px-8"
          >
            <AnimatePresence mode="popLayout">
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div
                    className={`flex ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
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
                      <p className="break-words ui-text-medium leading-7">
                        {message.content}
                      </p>
                      <p className="mt-2 ui-text-small text-white/45">
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
                        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 ui-text-small font-medium text-white/80 transition-colors hover:border-primary/40 hover:text-white"
                      >
                        <Search className="h-3.5 w-3.5" />
                        View sources
                      </button>
                    </div>
                  ) : null}
                </motion.div>
              ))}
            </AnimatePresence>

            {isAssistantSpeaking ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-start"
              >
                <div className="mr-3 mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/8">
                  <Bot className="h-4.5 w-4.5 text-blue-300" />
                </div>
                <div className="inline-flex items-center gap-2 rounded-3xl rounded-bl-xl border border-cyan-300/25 bg-cyan-300/10 px-4 py-3 shadow-[0_16px_40px_-28px_rgba(34,211,238,0.9)] backdrop-blur-md">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-cyan-100/90" />
                    <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-cyan-200/80 [animation-delay:180ms]" />
                    <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-cyan-300/70 [animation-delay:360ms]" />
                  </div>
                </div>
              </motion.div>
            ) : null}

            {isAwaitingReply && !isAssistantSpeaking ? (
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

          <div className="px-1 pb-2 pt-2 sm:px-4 lg:px-8">
            <div className="mx-auto max-w-4xl rounded-[1.75rem] bg-slate-950/38 p-3 shadow-[0_32px_80px_-42px_rgba(2,6,23,0.95)] ring-1 ring-white/10 backdrop-blur-xl">
              {chatError ? (
                <div className="mb-3 rounded-xl border border-amber-400/20 bg-amber-300/10 px-4 py-3 ui-text-small text-amber-100">
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
                    disabled={isComposerLocked}
                    className="min-h-12 max-h-32 w-full resize-none overflow-y-auto rounded-2xl border border-white/10 bg-white/10 px-4 py-3 pr-16 ui-text-medium leading-6 text-white placeholder:text-white/35 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-blue-400/50 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                  {draft.length > 0 ? (
                    <div className="absolute bottom-2 right-4 ui-text-small text-white/35">
                      {draft.length}
                    </div>
                  ) : null}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {isVoiceRecording ? (
                    <button
                      type="button"
                      onClick={onCancelVoiceInput}
                      className="inline-flex h-12 items-center gap-2 rounded-2xl border border-white/10 bg-white/8 px-4 text-white/78 transition-colors hover:bg-white/12 hover:text-white"
                    >
                      <X className="h-4.5 w-4.5" />
                      <span className="hidden sm:inline">Cancel</span>
                    </button>
                  ) : null}

                  {isSendMode ? (
                    <button
                      type="submit"
                      disabled={isComposerLocked}
                      className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-r from-blue-500 to-violet-600 text-white shadow-[0_22px_40px_-24px_rgba(59,130,246,0.95)] transition-all hover:scale-[1.02] hover:from-blue-600 hover:to-violet-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
                      aria-label="Send message"
                    >
                      <Send className="h-5 w-5" />
                    </button>
                  ) : isVoiceAvailable ? (
                    <button
                      type="button"
                      onClick={() => void onVoicePrimaryAction()}
                      disabled={isAwaitingReply || isAssistantSpeaking}
                      className={`flex h-12 w-12 items-center justify-center rounded-2xl border text-white transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
                        isVoiceRecording
                          ? "border-red-300/50 bg-red-500 text-white shadow-[0_0_0_6px_rgba(239,68,68,0.22),0_28px_45px_-28px_rgba(239,68,68,0.95)]"
                          : "border-white/10 bg-white/8 hover:bg-white/12"
                      }`}
                      aria-label={
                        isVoiceRecording
                          ? "Stop recording and send voice message"
                          : "Start voice recording"
                      }
                    >
                      <Mic className="h-5 w-5" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/6 text-white/35"
                      aria-label="Voice unavailable"
                    >
                      <MicOff className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </form>

              <div className="mt-3 flex items-center justify-between gap-3 ui-text-small text-white/45">
                <p>{getComposerHint({
                  draft,
                  isAssistantSpeaking,
                  isAwaitingReply,
                  isVoiceAvailable,
                  isVoiceRecording,
                })}</p>
                <span
                  className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 ${
                    isVoiceRecording
                      ? "border-red-300/35 bg-red-500/15 text-red-100"
                      : "border-white/10 bg-white/5 text-white/70"
                  }`}
                >
                  <VoiceStatusIcon className="h-3.5 w-3.5" />
                  {voiceStatus.label}
                </span>
              </div>
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
                <p className="ui-text-small font-medium uppercase tracking-[0.24em] text-primary/80">
                  Grounding
                </p>
                <h3 className="mt-1 font-display ui-text-large font-semibold text-white">
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
              <p className="mb-4 ui-text-small leading-relaxed text-white/70">
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
                      <p className="ui-text-small font-medium text-white">
                        {source.title}
                      </p>
                      <p className="mt-1 ui-text-small text-white/55">
                        {source.host}
                      </p>
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
