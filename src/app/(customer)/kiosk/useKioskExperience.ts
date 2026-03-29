"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";

import type { ChatMessageGrounding } from "@/types/api";
import type { ChatMessage } from "@/types/domain";

import {
  completeKioskChatSession,
  createKioskChatSession,
  createKioskLead,
  sendDeviceSessionHeartbeat,
  sendKioskChatMessage,
} from "./kioskApi";
import { buildMockReply, buildPreviewGreeting, createMessage } from "./kioskHelpers";
import type { KioskState, LiveChatSessionResult } from "./kioskTypes";
import { useLiveVoiceSession } from "./useLiveVoiceSession";

interface UseKioskExperienceInput {
  brandName: string;
  category: string;
  deviceSessionId: string | null;
  productId: string | null;
  productName: string;
}

function upsertGrounding(
  currentGrounding: Record<string, ChatMessageGrounding>,
  assistantMessageId: string,
  grounding: ChatMessageGrounding | null,
) {
  if (!grounding || grounding.sources.length === 0) {
    return currentGrounding;
  }

  return {
    ...currentGrounding,
    [assistantMessageId]: grounding,
  };
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

  function handleResolvedVoiceTurn(
    result: {
      assistantMessage: ChatMessage;
      grounding: ChatMessageGrounding | null;
      userMessage: ChatMessage;
    },
    pendingUserMessageId: string | null,
  ) {
    setChatError(null);
    setMessages((currentMessages) => {
      const hasPendingMessage =
        pendingUserMessageId !== null &&
        currentMessages.some((message) => message.id === pendingUserMessageId);

      const nextMessages =
        hasPendingMessage && pendingUserMessageId
          ? currentMessages.map((message) =>
              message.id === pendingUserMessageId ? result.userMessage : message,
            )
          : [...currentMessages, result.userMessage];

      return [...nextMessages, result.assistantMessage];
    });
    setGroundingByMessageId((currentGrounding) =>
      upsertGrounding(
        currentGrounding,
        result.assistantMessage.id,
        result.grounding,
      ),
    );
    setIsTyping(false);
  }

  function handleVoiceError(message: string) {
    setChatError(message);
    setIsTyping(false);
  }

  const voiceSession = useLiveVoiceSession({
    chatSessionId,
    onResolvedTurn: handleResolvedVoiceTurn,
    onVoiceError: handleVoiceError,
  });

  function finalizeChatSession(endedChatSessionId: string | null) {
    if (!endedChatSessionId) {
      return;
    }

    void completeKioskChatSession(endedChatSessionId).catch((error) => {
      console.error("Failed to complete kiosk chat session.", error);
    });
  }

  function resetExperience() {
    const activeChatSessionId = chatSessionId;

    if (typingTimeoutRef.current !== null) {
      window.clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    void voiceSession.disconnect();
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
    finalizeChatSession(activeChatSessionId);
  }

  const handleAutoReset = useEffectEvent(() => {
    resetExperience();
  });

  const sendHeartbeat = useEffectEvent(async () => {
    if (!deviceSessionId) {
      return;
    }

    try {
      await sendDeviceSessionHeartbeat(deviceSessionId);
    } catch (error) {
      console.error("Failed to send device session heartbeat.", error);
    }
  });

  useEffect(() => {
    if (!deviceSessionId) {
      return;
    }

    let heartbeatInterval: number | null = null;

    function clearHeartbeatInterval() {
      if (heartbeatInterval !== null) {
        window.clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }
    }

    function startHeartbeatLoop() {
      if (document.visibilityState !== "visible") {
        return;
      }

      void sendHeartbeat();
      heartbeatInterval = window.setInterval(() => {
        if (document.visibilityState === "visible") {
          void sendHeartbeat();
        }
      }, 5000);
    }

    function handleVisibilityChange() {
      clearHeartbeatInterval();
      startHeartbeatLoop();
    }

    startHeartbeatLoop();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearHeartbeatInterval();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [deviceSessionId]);

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

  const handleUnmount = useEffectEvent(() => {
    if (typingTimeoutRef.current !== null) {
      window.clearTimeout(typingTimeoutRef.current);
    }

    void voiceSession.disconnect();
  });

  useEffect(() => {
    return () => {
      handleUnmount();
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
      const activeLiveChatSessionId = liveChatSession?.sessionId ?? chatSessionId;

      if (liveChatSession?.initialMessage) {
        setMessages([liveChatSession.initialMessage]);
      } else if (messages.length === 0) {
        setMessages([createMessage("assistant", buildPreviewGreeting(productName, category))]);
      }

      await voiceSession.connect(activeLiveChatSessionId);
      return;
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

    setChatError(null);
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

      if (activeChatSessionId && voiceSession.isVoiceEnabled) {
        const pendingMessageId = `pending-${crypto.randomUUID()}`;

        setMessages((currentMessages) => [
          ...currentMessages,
          {
            content: normalizedContent,
            createdAt: new Date().toISOString(),
            id: pendingMessageId,
            role: "user",
          },
        ]);
        try {
          await voiceSession.sendTextTurn(normalizedContent, pendingMessageId);
          return;
        } catch (error) {
          setMessages((currentMessages) =>
            currentMessages.filter((message) => message.id !== pendingMessageId),
          );
          setChatError(
            error instanceof Error
              ? `${error.message} Switched back to typed chat.`
              : "Voice is unavailable right now. Switched back to typed chat.",
          );
        }
      }

      const nextMessages = [...messages, createMessage("user", normalizedContent)];

      setMessages(nextMessages);

      if (activeChatSessionId) {
        const response = await sendKioskChatMessage(
          activeChatSessionId,
          normalizedContent,
        );

        setMessages((currentMessages) => [
          ...currentMessages,
          response.assistantMessage,
        ]);
        setGroundingByMessageId((currentGrounding) =>
          upsertGrounding(
            currentGrounding,
            response.assistantMessage.id,
            response.grounding,
          ),
        );
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
    activeGrounding:
      activeGroundingMessageId === null
        ? null
        : groundingByMessageId[activeGroundingMessageId] ?? null,
    activeGroundingMessageId,
    chatError,
    closeGrounding: () => setActiveGroundingMessageId(null),
    customerEmail,
    customerName,
    customerPhone,
    draft,
    groundingByMessageId,
    isLiveSession: Boolean(deviceSessionId),
    isSubmittingLead,
    isTyping:
      isTyping ||
      voiceSession.voiceState === "assistant-speaking" ||
      voiceSession.voiceState === "connecting",
    leadError,
    messages,
    openGroundingForMessage: (messageId: string) =>
      setActiveGroundingMessageId((currentMessageId) =>
        currentMessageId === messageId ? null : messageId,
      ),
    resetExperience,
    sendMessage,
    setCustomerEmail,
    setCustomerName,
    setCustomerPhone,
    setDraft,
    startExperience,
    state,
    submitLead,
    transitionToLeadCapture: async () => {
      await voiceSession.disconnect();
      setState("lead");
    },
    voiceError: voiceSession.voiceError,
    voiceState: voiceSession.voiceState,
  };
}
