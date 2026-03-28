"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { ArrowRight, Mail, Phone, Sparkles, UserCircle2, X } from "lucide-react";
import type { ApiErrorResponse, ApiSuccessResponse } from "@/types/api";
import type { ChatSession } from "@/types/domain";

type KioskState = "idle" | "chat" | "lead" | "thanks";
type MessageRole = "assistant" | "user";

interface ChatMessage {
  content: string;
  id: string;
  role: MessageRole;
}

interface KioskExperienceProps {
  brandName: string;
  category: string;
  comparisonSnippet: string;
  deviceSessionId: string | null;
  detailsMarkdown: string;
  idleMediaUrl: string | null;
  productName: string;
  sourceLabel: string;
}

interface ChatSessionCreatePayload {
  initialMessage: ChatMessage;
  session: ChatSession;
}

interface ChatSessionMessagePayload {
  assistantMessage: ChatMessage;
  session: ChatSession;
}

function buildGreeting() {
  return "What can I help you with.";
}

function extractMarkdownBulletLines(detailsMarkdown: string) {
  return detailsMarkdown
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^[-*]\s+/.test(line))
    .map((line) => line.replace(/^[-*]\s+/, "").replace(/\*\*/g, ""))
    .filter(Boolean);
}

function extractMarkdownParagraphs(detailsMarkdown: string) {
  return detailsMarkdown
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#") && !/^[-*]\s+/.test(line))
    .map((line) => line.replace(/\*\*/g, ""))
    .filter(Boolean);
}

function buildMarketingHighlights(detailsMarkdown: string, comparisonSnippet: string) {
  const bulletLines = extractMarkdownBulletLines(detailsMarkdown);
  const paragraphLines = extractMarkdownParagraphs(detailsMarkdown);
  const snippetParts = comparisonSnippet
    .split(/[.;]/)
    .map((part) => part.trim())
    .filter(Boolean);

  const highlights = [...bulletLines, ...snippetParts].slice(0, 4);

  if (highlights.length > 0) {
    return highlights;
  }

  return paragraphLines.slice(0, 4);
}

function buildMarketingSummary(detailsMarkdown: string, comparisonSnippet: string) {
  const paragraphLines = extractMarkdownParagraphs(detailsMarkdown);

  if (paragraphLines.length > 0) {
    return paragraphLines[0];
  }

  return comparisonSnippet;
}

function isImageUrl(url: string | null) {
  if (!url) {
    return false;
  }

  return /\.(avif|gif|jpe?g|png|webp|svg)$/i.test(url);
}

function buildMockReply(
  messageCount: number,
  productName: string,
  brandName: string,
  category: string,
) {
  const replies = [
    `The ${brandName} ${productName} is strongest when you want a polished ${category.toLowerCase()} experience without friction. If you tell me what you care about most, I can narrow the pitch quickly.`,
    `A good next step is to try the core interaction on this device right now. Pay attention to speed, feel, and whether the interface feels natural for your day-to-day use.`,
    `If you are comparing options in-store, I can explain where the ${productName} is a stronger fit and where another product might make more sense. I will keep the comparison grounded.`,
    `That is a common buying question. I would frame the ${productName} around overall experience first, then decide whether you need a sharper comparison on performance, camera, or value.`,
  ];

  return replies[messageCount % replies.length];
}

function createMessage(role: MessageRole, content: string): ChatMessage {
  return {
    content,
    id: crypto.randomUUID(),
    role,
  };
}

async function readJsonResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T;
  return payload;
}

export default function KioskExperience({
  brandName,
  category,
  comparisonSnippet,
  deviceSessionId,
  detailsMarkdown,
  idleMediaUrl,
  productName,
  sourceLabel,
}: KioskExperienceProps) {
  const [state, setState] = useState<KioskState>("idle");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [chatSessionId, setChatSessionId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const chatSessionRequestRef = useRef<Promise<string | null> | null>(null);
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<number | null>(null);
  const marketingHighlights = buildMarketingHighlights(
    detailsMarkdown,
    comparisonSnippet,
  );
  const marketingSummary = buildMarketingSummary(
    detailsMarkdown,
    comparisonSnippet,
  );
  const showImagePreview = isImageUrl(idleMediaUrl);

  function resetExperience() {
    if (typingTimeoutRef.current !== null) {
      window.clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    setCustomerEmail("");
    setCustomerName("");
    setCustomerPhone("");
    setChatError(null);
    setChatSessionId(null);
    chatSessionRequestRef.current = null;
    setDraft("");
    setIsTyping(false);
    setMessages([]);
    setState("idle");
  }

  useEffect(() => {
    messagesRef.current?.scrollTo({
      behavior: "smooth",
      top: messagesRef.current.scrollHeight,
    });
  }, [isTyping, messages]);

  useEffect(() => {
    if (state !== "thanks") {
      return;
    }

    const resetTimeout = window.setTimeout(() => {
      resetExperience();
    }, 4000);

    return () => {
      window.clearTimeout(resetTimeout);
    };
  }, [state]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current !== null) {
        window.clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  function startExperience() {
    setChatError(null);
    setMessages([createMessage("assistant", buildGreeting())]);
    setState("chat");

    if (deviceSessionId) {
      void ensureServerChatSession().catch((error) => {
        setChatError(
          error instanceof Error
            ? error.message
            : "Live chat is unavailable right now.",
        );
      });
    }
  }

  async function createServerChatSession() {
    if (!deviceSessionId) {
      return null;
    }

    const response = await fetch("/api/v1/chat-sessions", {
      body: JSON.stringify({
        deviceSessionId,
      }),
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    });

    if (!response.ok) {
      const errorPayload = await readJsonResponse<ApiErrorResponse>(response);
      throw new Error(
        errorPayload.error.message || "Failed to create a live chat session.",
      );
    }

    const payload =
      await readJsonResponse<ApiSuccessResponse<ChatSessionCreatePayload>>(response);

    return payload.data.session.id;
  }

  async function ensureServerChatSession() {
    if (!deviceSessionId) {
      return null;
    }

    if (chatSessionId) {
      return chatSessionId;
    }

    if (!chatSessionRequestRef.current) {
      chatSessionRequestRef.current = createServerChatSession()
        .then((sessionId) => {
          setChatSessionId(sessionId);
          return sessionId;
        })
        .finally(() => {
          chatSessionRequestRef.current = null;
        });
    }

    return chatSessionRequestRef.current;
  }

  async function sendMessageToApi(activeChatSessionId: string, content: string) {
    const response = await fetch(
      `/api/v1/chat-sessions/${activeChatSessionId}/messages`,
      {
        body: JSON.stringify({
          content,
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      },
    );

    if (!response.ok) {
      const errorPayload = await readJsonResponse<ApiErrorResponse>(response);
      throw new Error(errorPayload.error.message || "Failed to send message.");
    }

    const payload =
      await readJsonResponse<ApiSuccessResponse<ChatSessionMessagePayload>>(response);

    return payload.data.assistantMessage;
  }

  async function sendMessage(content: string) {
    const normalizedContent = content.trim();

    if (!normalizedContent || isTyping) {
      return;
    }

    const nextMessages = [
      ...messages,
      createMessage("user", normalizedContent),
    ];

    setChatError(null);
    setMessages(nextMessages);
    setDraft("");
    setIsTyping(true);

    try {
      const activeChatSessionId =
        chatSessionId ?? (await ensureServerChatSession());

      if (activeChatSessionId) {
        const assistantMessage = await sendMessageToApi(
          activeChatSessionId,
          normalizedContent,
        );

        setMessages((currentMessages) => [
          ...currentMessages,
          assistantMessage,
        ]);
      } else {
        typingTimeoutRef.current = window.setTimeout(() => {
          setMessages((currentMessages) => [
            ...currentMessages,
            createMessage(
              "assistant",
              buildMockReply(
                currentMessages.filter((message) => message.role === "assistant").length,
                productName,
                brandName,
                category,
              ),
            ),
          ]);
          setIsTyping(false);
          typingTimeoutRef.current = null;
        }, 900);

        return;
      }
    } catch (error) {
      setChatError(
        error instanceof Error
          ? error.message
          : "Live chat is unavailable right now.",
      );
    } finally {
      setIsTyping(false);
      typingTimeoutRef.current = null;
    }
  }

  function handleLeadSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!customerName.trim() || !customerEmail.trim()) {
      return;
    }

    setState("thanks");
  }

  if (state === "idle") {
    return (
      <main className="kiosk-screen kiosk-text relative min-h-screen overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(96,165,250,0.22),transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.04),transparent_48%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:clamp(3.5rem,7vw,6rem)_clamp(3.5rem,7vw,6rem)] opacity-20" />

        <button
          type="button"
          className="relative z-10 flex min-h-screen w-full items-center justify-center px-6 py-10 text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/60 sm:px-10"
          onClick={startExperience}
          aria-label="Tap anywhere to start the kiosk experience"
        >
          <div className="flex w-full max-w-6xl flex-col justify-between gap-14">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.34em] text-white/55">
                  SaleSense
                </p>
                <p className="mt-3 max-w-sm text-sm leading-6 text-white/65">
                  {sourceLabel}. This kiosk is ready to guide the next in-store
                  customer.
                </p>
              </div>

              <div className="inline-flex items-center gap-3 self-start rounded-full border border-white/12 bg-white/6 px-4 py-2 text-xs uppercase tracking-[0.28em] text-white/72 backdrop-blur">
                <span className="h-2.5 w-2.5 rounded-full bg-primary shadow-[0_0_18px_rgba(96,165,250,0.95)] animate-pulse" />
                Idle mode
              </div>
            </div>

            <div className="max-w-4xl">
              <p className="text-sm font-medium uppercase tracking-[0.32em] text-primary/90">
                {brandName}
              </p>
              <h1 className="mt-6 max-w-3xl font-display text-5xl font-bold leading-[0.92] tracking-[-0.04em] text-balance sm:text-7xl lg:text-[5.75rem]">
                {productName}
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-white/70 sm:text-lg">
                Tap to wake the sales guide and start a guided conversation
                about this product.
              </p>
            </div>

            <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <div className="inline-flex w-fit items-center gap-4 rounded-full border border-white/12 bg-white/10 px-6 py-4 backdrop-blur-md">
                <span className="relative flex h-14 w-14 items-center justify-center rounded-full kiosk-gradient-bg kiosk-glow text-white">
                  <Sparkles className="h-6 w-6" />
                  <span className="kiosk-pulse-ring absolute inset-0 rounded-full border border-primary/60" />
                </span>
                <div>
                  <p className="text-[0.7rem] font-semibold uppercase tracking-[0.34em] text-white/45">
                    Interaction
                  </p>
                  <p className="mt-1 text-lg font-medium tracking-tight">
                    Tap anywhere to begin
                  </p>
                </div>
              </div>

              <p className="max-w-sm text-sm leading-6 text-white/55 sm:text-right">
                Milestone 1 keeps the interaction typed and kiosk-like, with a
                clear reset back to idle after the session ends.
              </p>
            </div>
          </div>
        </button>
      </main>
    );
  }

  if (state === "lead") {
    return (
      <main className="kiosk-screen kiosk-text relative min-h-screen overflow-hidden px-6 py-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(96,165,250,0.18),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.03),transparent)]" />
        <div className="relative z-10 mx-auto flex min-h-[calc(100vh-5rem)] max-w-lg items-center">
          <div className="w-full rounded-[2rem] border border-white/10 bg-white/6 p-8 shadow-[0_30px_90px_-50px_rgba(15,23,42,0.9)] backdrop-blur-xl">
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full kiosk-gradient-bg kiosk-glow">
                <UserCircle2 className="h-8 w-8 text-white" />
              </div>
              <h1 className="mt-5 font-display text-3xl font-semibold tracking-tight">
                Stay in touch?
              </h1>
              <p className="mt-3 text-sm leading-6 text-white/65">
                Leave your details and the store team can follow up with the
                best next recommendation for {productName}.
              </p>
            </div>

            <form onSubmit={handleLeadSubmit} className="mt-8 space-y-4">
              <div className="space-y-2">
                <label htmlFor="customer-name" className="text-sm font-medium text-white/82">
                  Name
                </label>
                <div className="relative">
                  <UserCircle2 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                  <input
                    id="customer-name"
                    value={customerName}
                    onChange={(event) => setCustomerName(event.target.value)}
                    required
                    className="w-full rounded-xl border border-white/10 bg-white/8 px-11 py-3.5 text-sm text-white placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-primary/55"
                    placeholder="Your name"
                    type="text"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="customer-email" className="text-sm font-medium text-white/82">
                  Email
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                  <input
                    id="customer-email"
                    value={customerEmail}
                    onChange={(event) => setCustomerEmail(event.target.value)}
                    required
                    className="w-full rounded-xl border border-white/10 bg-white/8 px-11 py-3.5 text-sm text-white placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-primary/55"
                    placeholder="you@example.com"
                    type="email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="customer-phone" className="text-sm font-medium text-white/82">
                  Phone
                </label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                  <input
                    id="customer-phone"
                    value={customerPhone}
                    onChange={(event) => setCustomerPhone(event.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/8 px-11 py-3.5 text-sm text-white placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-primary/55"
                    placeholder="Optional phone number"
                    type="tel"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                <button
                  type="submit"
                  className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl kiosk-gradient-bg px-5 text-sm font-semibold text-white transition-opacity hover:opacity-92"
                >
                  Submit lead
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={resetExperience}
                  className="inline-flex h-12 items-center justify-center rounded-xl border border-white/12 bg-white/6 px-5 text-sm font-medium text-white/80 transition-colors hover:bg-white/10"
                >
                  Skip
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    );
  }

  if (state === "thanks") {
    return (
      <main className="kiosk-screen kiosk-text flex min-h-screen items-center justify-center px-6 text-center">
        <div className="max-w-md">
          <div className="mx-auto flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full kiosk-gradient-bg kiosk-glow text-3xl font-semibold text-white">
            ✓
          </div>
          <h1 className="mt-6 font-display text-4xl font-semibold tracking-tight">
            Thank you
          </h1>
          <p className="mt-3 text-base leading-7 text-white/65">
            A team member can follow up soon. This kiosk will reset back to idle
            automatically.
          </p>
        </div>
      </main>
    );
  }

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
                Live chat
              </div>
              <button
                type="button"
                onClick={() => setState("lead")}
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
            <div
              ref={messagesRef}
              className="flex-1 overflow-y-auto px-4 py-6 sm:px-6"
            >
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
                void sendMessage(draft);
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
                  onChange={(event) => setDraft(event.target.value)}
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
