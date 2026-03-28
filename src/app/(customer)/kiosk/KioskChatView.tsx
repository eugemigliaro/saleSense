"use client";

import { useEffect, useRef } from "react";

import { ArrowRight, X } from "lucide-react";

import type { ChatMessage } from "@/types/domain";

interface KioskChatViewProps {
  brandName: string;
  category: string;
  comparisonSnippet: string;
  deviceSessionId: string | null;
  draft: string;
  idleMediaUrl: string | null;
  isTyping: boolean;
  marketingHighlights: string[];
  marketingSummary: string;
  messages: ChatMessage[];
  productName: string;
  showImagePreview: boolean;
  sourceLabel: string;
  chatError: string | null;
  onDraftChange: (value: string) => void;
  onEndSession: () => void;
  onSendMessage: (content: string) => void | Promise<void>;
}

export function KioskChatView({
  brandName,
  category,
  comparisonSnippet,
  deviceSessionId,
  draft,
  idleMediaUrl,
  isTyping,
  marketingHighlights,
  marketingSummary,
  messages,
  productName,
  showImagePreview,
  sourceLabel,
  chatError,
  onDraftChange,
  onEndSession,
  onSendMessage,
}: KioskChatViewProps) {
  const messagesRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesRef.current?.scrollTo({
      behavior: "smooth",
      top: messagesRef.current.scrollHeight,
    });
  }, [isTyping, messages]);

  return (
    <main className="kiosk-screen kiosk-text relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(96,165,250,0.18),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.03),transparent)]" />

      <div className="relative z-10 flex min-h-screen flex-col">
        <header className="border-b border-white/10 px-4 py-4 sm:px-6">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-white/45">
                SaleSense
              </p>
              <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight">
                {brandName} {productName}
              </h1>
              <p className="mt-1 text-sm text-white/55">
                {category} demo. {sourceLabel}.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-4 py-2 text-xs uppercase tracking-[0.24em] text-white/72 backdrop-blur">
                <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_14px_rgba(96,165,250,0.95)]" />
                {deviceSessionId ? "Live chat" : "Preview chat"}
              </div>
              <button
                type="button"
                onClick={onEndSession}
                className="inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/8 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/12"
              >
                End session
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>

        <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col lg:grid lg:grid-cols-[22rem_minmax(0,1fr)]">
          <aside className="border-b border-white/10 px-4 py-6 lg:border-b-0 lg:border-r lg:px-6">
            <div className="rounded-[1.75rem] border border-white/10 bg-white/6 p-5 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/90">
                Current device
              </p>

              <div className="mt-4 overflow-hidden rounded-[1.5rem] border border-white/10 bg-black/25">
                {showImagePreview ? (
                  <div
                    className="h-48 w-full bg-cover bg-center"
                    style={{ backgroundImage: `url(${idleMediaUrl})` }}
                    aria-label={`${productName} preview`}
                  />
                ) : (
                  <div className="kiosk-gradient-bg flex h-48 w-full flex-col justify-end p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/60">
                      {category}
                    </p>
                    <h2 className="mt-2 font-display text-3xl font-semibold leading-tight text-white">
                      {productName}
                    </h2>
                    <p className="mt-2 text-sm text-white/72">{brandName}</p>
                  </div>
                )}
              </div>

              <div className="mt-5">
                <h2 className="font-display text-3xl font-semibold leading-tight tracking-tight">
                  {brandName} {productName}
                </h2>
                <p className="mt-2 text-sm uppercase tracking-[0.24em] text-white/45">
                  {category}
                </p>
                <p className="mt-4 text-sm leading-7 text-white/65">
                  {marketingSummary}
                </p>
              </div>

              <div className="mt-6 rounded-[1.25rem] border border-white/10 bg-black/15 px-4 py-4 text-sm text-white/72">
                <p className="font-medium text-white">Device mode</p>
                <p className="mt-1">{sourceLabel}</p>
                <p className="mt-3 font-medium text-white">Chat source</p>
                <p className="mt-1">
                  {deviceSessionId ? "Live API and AI" : "Preview fallback"}
                </p>
                <p className="mt-3 font-medium text-white">Sales positioning</p>
                <p className="mt-1">{comparisonSnippet}</p>
              </div>

              <div className="mt-6">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/90">
                  Key specs
                </p>
                <ul className="mt-4 space-y-3 text-sm leading-6 text-white/78">
                  {marketingHighlights.map((highlight) => (
                    <li key={highlight} className="flex gap-3">
                      <span className="mt-2 h-2 w-2 rounded-full bg-primary/85" />
                      <span>{highlight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </aside>

          <section className="flex min-h-0 flex-1 flex-col">
            <div ref={messagesRef} className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
              <div className="mx-auto flex max-w-4xl flex-col gap-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-[1.5rem] px-5 py-4 text-[15px] leading-7 sm:max-w-[72%] ${
                        message.role === "user"
                          ? "kiosk-gradient-bg text-white shadow-[0_22px_40px_-28px_rgba(37,99,235,0.95)]"
                          : "border border-white/10 bg-white/6 text-white/90 backdrop-blur"
                      }`}
                    >
                      {message.content}
                    </div>
                  </div>
                ))}

                {isTyping ? (
                  <div className="flex justify-start">
                    <div className="flex items-center gap-2 rounded-[1.5rem] border border-white/10 bg-white/6 px-5 py-4 backdrop-blur">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-white/45 [animation-delay:0ms]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-white/45 [animation-delay:120ms]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-white/45 [animation-delay:240ms]" />
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                void onSendMessage(draft);
              }}
              className="border-t border-white/10 px-4 py-4 sm:px-6"
            >
              <div className="mx-auto max-w-4xl">
                {chatError ? (
                  <div className="mb-3 rounded-xl border border-amber-400/20 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
                    {chatError}
                  </div>
                ) : null}

                <div className="flex flex-col gap-3 sm:flex-row">
                  <input
                    type="text"
                    value={draft}
                    onChange={(event) => onDraftChange(event.target.value)}
                    placeholder="Type a customer message..."
                    className="h-[3.25rem] flex-1 rounded-xl border border-white/10 bg-white/8 px-5 text-sm text-white placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-primary/55"
                  />
                  <button
                    type="submit"
                    disabled={!draft.trim() || isTyping}
                    className="inline-flex h-[3.25rem] items-center justify-center gap-2 rounded-xl kiosk-gradient-bg px-5 text-sm font-semibold text-white transition-opacity hover:opacity-92 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    Send
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}
