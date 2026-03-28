"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";

import type { ChatMessageGrounding } from "@/types/api";
import type { ChatMessage } from "@/types/domain";

import { createKioskLead, createKioskChatSession, sendKioskChatMessage } from "./kioskApi";
import { buildMockReply, buildPreviewGreeting, createMessage } from "./kioskHelpers";
import type { KioskState, LiveChatSessionResult } from "./kioskTypes";

interface UseKioskExperienceInput {
  brandName: string;
  category: string;
  deviceSessionId: string | null;
  productId: string | null;
  productName: string;
}

export function useKioskExperience({
  brandName,
  category,
  deviceSessionId,
  productId,
  productName,
}: UseKioskExperienceInput) {
  const [state, setState] = useState<KioskState>("idle");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [groundingByMessageId, setGroundingByMessageId] = useState<
    Record<string, ChatMessageGrounding>
  >({});
  const [activeGroundingMessageId, setActiveGroundingMessageId] = useState<
    string | null
  >(null);
  const [draft, setDraft] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [chatSessionId, setChatSessionId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [leadError, setLeadError] = useState<string | null>(null);
  const [isSubmittingLead, setIsSubmittingLead] = useState(false);
  const chatSessionRequestRef = useRef<Promise<LiveChatSessionResult | null> | null>(
    null,
  );
  const typingTimeoutRef = useRef<number | null>(null);

  function resetExperience() {
    if (typingTimeoutRef.current !== null) {
      window.clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    setCustomerEmail("");
    setCustomerName("");
    setCustomerPhone("");
    setChatError(null);
    setLeadError(null);
    setChatSessionId(null);
    chatSessionRequestRef.current = null;
    setGroundingByMessageId({});
    setActiveGroundingMessageId(null);
    setDraft("");
    setIsTyping(false);
    setMessages([]);
    setState("idle");
  }

  const handleAutoReset = useEffectEvent(() => {
    resetExperience();
  });

  useEffect(() => {
    if (state !== "thanks") {
      return;
    }

    const resetTimeout = window.setTimeout(() => {
      handleAutoReset();
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

  async function ensureServerChatSession() {
    if (!deviceSessionId) {
      return null;
    }

    if (chatSessionId) {
      return {
        initialMessage: null,
        sessionId: chatSessionId,
      } satisfies LiveChatSessionResult;
    }

    if (!chatSessionRequestRef.current) {
      chatSessionRequestRef.current = createKioskChatSession(deviceSessionId)
        .then((liveChatSession) => {
          setChatSessionId(liveChatSession.sessionId);
          return liveChatSession;
        })
        .finally(() => {
          chatSessionRequestRef.current = null;
        });
    }

    return chatSessionRequestRef.current;
  }

  async function startExperience() {
    setChatError(null);
    setLeadError(null);
    setMessages([]);
    setGroundingByMessageId({});
    setActiveGroundingMessageId(null);
    setDraft("");
    setState("chat");

    if (!deviceSessionId) {
      setMessages([createMessage("assistant", buildPreviewGreeting(productName, category))]);
      return;
    }

    setIsTyping(true);

    try {
      const liveChatSession = await ensureServerChatSession();

      if (liveChatSession?.initialMessage) {
        setMessages([liveChatSession.initialMessage]);
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
    }

    setMessages([createMessage("assistant", buildPreviewGreeting(productName, category))]);
  }

  async function sendMessage(content: string) {
    const normalizedContent = content.trim();

    if (!normalizedContent || isTyping) {
      return;
    }

    const nextMessages = [...messages, createMessage("user", normalizedContent)];

    setChatError(null);
    setMessages(nextMessages);
    setDraft("");
    setIsTyping(true);
    let previewReplyScheduled = false;

    try {
      const liveChatSession =
        chatSessionId !== null
          ? {
              initialMessage: null,
              sessionId: chatSessionId,
            }
          : await ensureServerChatSession();
      const activeChatSessionId = liveChatSession?.sessionId ?? null;

      if (activeChatSessionId) {
        const response = await sendKioskChatMessage(
          activeChatSessionId,
          normalizedContent,
        );

        setMessages((currentMessages) => [
          ...currentMessages,
          response.assistantMessage,
        ]);
        setGroundingByMessageId((currentGrounding) => {
          if (!response.grounding || response.grounding.sources.length === 0) {
            return currentGrounding;
          }

          return {
            ...currentGrounding,
            [response.assistantMessage.id]: response.grounding,
          };
        });
      } else {
        previewReplyScheduled = true;
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
      if (!previewReplyScheduled) {
        setIsTyping(false);
        typingTimeoutRef.current = null;
      }
    }
  }

  async function submitLead() {
    if (!customerName.trim() || !customerEmail.trim()) {
      return;
    }

    setLeadError(null);
    setIsSubmittingLead(true);

    try {
      if (productId) {
        await createKioskLead({
          customerEmail: customerEmail.trim(),
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim() || undefined,
          chatSessionId: chatSessionId ?? undefined,
          productId,
        });
      }

      setState("thanks");
    } catch (error) {
      setLeadError(
        error instanceof Error
          ? error.message
          : "Lead submission is unavailable right now.",
      );
    } finally {
      setIsSubmittingLead(false);
    }
  }

  return {
    chatError,
    customerEmail,
    customerName,
    customerPhone,
    draft,
    isLiveSession: Boolean(deviceSessionId),
    isSubmittingLead,
    isTyping,
    leadError,
    messages,
    groundingByMessageId,
    activeGroundingMessageId,
    resetExperience,
    activeGrounding:
      activeGroundingMessageId === null
        ? null
        : groundingByMessageId[activeGroundingMessageId] ?? null,
    closeGrounding: () => setActiveGroundingMessageId(null),
    openGroundingForMessage: (messageId: string) =>
      setActiveGroundingMessageId((currentMessageId) =>
        currentMessageId === messageId ? null : messageId,
      ),
    setCustomerEmail,
    setCustomerName,
    setCustomerPhone,
    setDraft,
    startExperience,
    state,
    submitLead,
    transitionToLeadCapture: () => setState("lead"),
    sendMessage,
  };
}
