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
import {
  buildMockReply,
  buildPreviewGreeting,
  createMessage,
} from "./kioskHelpers";
import type { KioskState, LiveChatSessionResult } from "./kioskTypes";
import { useLiveVoiceSession } from "./useLiveVoiceSession";

const CHAT_INACTIVITY_TIMEOUT_MS = 10_000;
const LEAD_CAPTURE_INACTIVITY_TIMEOUT_MS = 10_000;

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
  const [isAwaitingReply, setIsAwaitingReply] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [chatSessionId, setChatSessionId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [leadError, setLeadError] = useState<string | null>(null);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [isSubmittingLead, setIsSubmittingLead] = useState(false);
  const [isVoiceDefaultEnabled, setIsVoiceDefaultEnabled] = useState(true);
  const [activityTick, setActivityTick] = useState(0);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
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
    setIsAwaitingReply(false);
  }

  function handleVoiceError(message: string) {
    setChatError(message);
    setIsAwaitingReply(false);
  }

  const voiceSession = useLiveVoiceSession({
    chatSessionId,
    onResolvedTurn: handleResolvedVoiceTurn,
    onVoiceError: handleVoiceError,
  });

  async function finalizeChatSession(
    endedChatSessionId: string | null,
    feedbackScore?: number,
  ) {
    if (!endedChatSessionId) {
      return;
    }

    try {
      await completeKioskChatSession(endedChatSessionId, feedbackScore);
    } catch (error) {
      console.error("Failed to complete kiosk chat session.", error);
      throw error;
    } finally {
      setChatSessionId((currentChatSessionId) =>
        currentChatSessionId === endedChatSessionId ? null : currentChatSessionId,
      );
    }
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
    setChatError(null);
    setLeadError(null);
    setFeedbackError(null);
    setIsSubmittingLead(false);
    setIsSubmittingFeedback(false);
    setChatSessionId(null);
    chatSessionRequestRef.current = null;
    setGroundingByMessageId({});
    setActiveGroundingMessageId(null);
    setDraft("");
    setIsAwaitingReply(false);
    setIsVoiceDefaultEnabled(true);
    setMessages([]);
    setState("idle");
    void finalizeChatSession(activeChatSessionId);
  }

  const handleAutoReset = useEffectEvent(() => {
    resetExperience();
  });

  function recordConversationActivity() {
    setActivityTick((currentTick) => currentTick + 1);
  }

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

  useEffect(() => {
    if (state !== "chat" && state !== "lead" && state !== "feedback") {
      return;
    }

    function handleActivityEvent() {
      recordConversationActivity();
    }

    document.addEventListener("keydown", handleActivityEvent);
    document.addEventListener("pointerdown", handleActivityEvent);
    document.addEventListener("touchstart", handleActivityEvent, {
      passive: true,
    });

    return () => {
      document.removeEventListener("keydown", handleActivityEvent);
      document.removeEventListener("pointerdown", handleActivityEvent);
      document.removeEventListener("touchstart", handleActivityEvent);
    };
  }, [state]);

  const maybeStartDefaultVoiceInput = useEffectEvent(() => {
    if (
      state !== "chat" ||
      draft.trim().length > 0 ||
      !isVoiceDefaultEnabled ||
      !voiceSession.isVoiceEnabled ||
      voiceSession.isAwaitingResponse ||
      voiceSession.isRecording ||
      voiceSession.voiceState !== "ready"
    ) {
      return;
    }

    void voiceSession.startRecording();
  });

  useEffect(() => {
    maybeStartDefaultVoiceInput();
  }, [
    draft,
    isVoiceDefaultEnabled,
    state,
    voiceSession.isAwaitingResponse,
    voiceSession.isRecording,
    voiceSession.isVoiceEnabled,
    voiceSession.voiceState,
  ]);

  const hasUserMessages = messages.some((message) => message.role === "user");

  const handleAutoLeadCapture = useEffectEvent(async () => {
    await voiceSession.disconnect();
    setState("lead");
  });

  useEffect(() => {
    if (state !== "chat" && state !== "lead" && state !== "feedback") {
      return;
    }

    if (
      state === "chat" &&
      (isAwaitingReply ||
        voiceSession.isAwaitingResponse ||
        voiceSession.voiceState === "assistant-speaking" ||
        voiceSession.voiceState === "connecting")
    ) {
      return;
    }

    const timeoutMs =
      state === "chat"
        ? CHAT_INACTIVITY_TIMEOUT_MS
        : LEAD_CAPTURE_INACTIVITY_TIMEOUT_MS;
    const inactivityTimeout = window.setTimeout(() => {
      if (state === "chat") {
        if (!hasUserMessages) {
          handleAutoReset();
          return;
        }

        void handleAutoLeadCapture();
        return;
      }

      handleAutoReset();
    }, timeoutMs);

    return () => {
      window.clearTimeout(inactivityTimeout);
    };
  }, [
    activeGroundingMessageId,
    activityTick,
    chatError,
    customerEmail,
    customerName,
    draft,
    feedbackError,
    hasUserMessages,
    isAwaitingReply,
    leadError,
    messages,
    state,
    voiceSession.isAwaitingResponse,
    voiceSession.voiceState,
  ]);

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
    setFeedbackError(null);
    setMessages([]);
    setGroundingByMessageId({});
    setActiveGroundingMessageId(null);
    setDraft("");
    setIsAwaitingReply(false);
    setIsVoiceDefaultEnabled(true);
    setState("chat");
    recordConversationActivity();

    if (!deviceSessionId) {
      setMessages([
        createMessage("assistant", buildPreviewGreeting(productName, category)),
      ]);
      return;
    }

    setIsAwaitingReply(true);

    try {
      const liveChatSession = await ensureServerChatSession();
      const activeLiveChatSessionId = liveChatSession?.sessionId ?? chatSessionId;

      if (liveChatSession?.initialMessage) {
        setMessages([liveChatSession.initialMessage]);
      } else {
        setMessages((currentMessages) =>
          currentMessages.length > 0
            ? currentMessages
            : [
                createMessage(
                  "assistant",
                  buildPreviewGreeting(productName, category),
                ),
              ],
        );
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
      setIsAwaitingReply(false);
    }

    setMessages([
      createMessage("assistant", buildPreviewGreeting(productName, category)),
    ]);
  }

  async function sendMessage(content: string) {
    const normalizedContent = content.trim();

    if (
      !normalizedContent ||
      isAwaitingReply ||
      voiceSession.isAwaitingResponse ||
      voiceSession.voiceState === "assistant-speaking"
    ) {
      return;
    }

    voiceSession.cancelRecording();
    setChatError(null);
    setDraft("");
    setIsAwaitingReply(true);
    recordConversationActivity();
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

      setMessages((currentMessages) => [
        ...currentMessages,
        createMessage("user", normalizedContent),
      ]);

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
                currentMessages.filter(
                  (message) => message.role === "assistant",
                ).length,
                productName,
                brandName,
                category,
              ),
            ),
          ]);
          setIsAwaitingReply(false);
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
        setIsAwaitingReply(false);
        typingTimeoutRef.current = null;
      }
    }
  }

  function handleDraftChange(nextDraft: string) {
    if (nextDraft.trim().length > 0 && voiceSession.isRecording) {
      voiceSession.cancelRecording();
      setIsVoiceDefaultEnabled(false);
    }

    setDraft(nextDraft);
    recordConversationActivity();
  }

  async function handleVoicePrimaryAction() {
    recordConversationActivity();

    if (voiceSession.isRecording) {
      try {
        setChatError(null);
        await voiceSession.submitRecording();
      } catch (error) {
        setChatError(
          error instanceof Error
            ? error.message
            : "Voice is unavailable right now.",
        );
      }

      return;
    }

    if (voiceSession.isVoiceEnabled) {
      await voiceSession.startRecording();
    }
  }

  function cancelVoiceInput() {
    voiceSession.cancelRecording();
    setIsVoiceDefaultEnabled(false);
    recordConversationActivity();
  }

  async function submitLead() {
    if (!customerName.trim() || !customerEmail.trim()) {
      return;
    }

    setLeadError(null);
    setIsSubmittingLead(true);
    recordConversationActivity();

    try {
      if (productId) {
        await createKioskLead({
          customerEmail: customerEmail.trim(),
          customerName: customerName.trim(),
          chatSessionId: chatSessionId ?? undefined,
          productId,
        });
      }

      setState("feedback");
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

  async function skipLeadCapture() {
    recordConversationActivity();
    await voiceSession.disconnect();
    setLeadError(null);
    setState("feedback");
  }

  async function skipFeedback() {
    recordConversationActivity();
    setFeedbackError(null);
    setIsSubmittingFeedback(true);

    try {
      await finalizeChatSession(chatSessionId);
      setState("thanks");
    } catch (error) {
      setFeedbackError(
        error instanceof Error
          ? error.message
          : "Feedback submission is unavailable right now.",
      );
    } finally {
      setIsSubmittingFeedback(false);
    }
  }

  async function submitFeedback(rating: number) {
    recordConversationActivity();
    setFeedbackError(null);
    setIsSubmittingFeedback(true);

    try {
      await finalizeChatSession(chatSessionId, rating);
      setState("thanks");
    } catch (error) {
      setFeedbackError(
        error instanceof Error
          ? error.message
          : "Feedback submission is unavailable right now.",
      );
    } finally {
      setIsSubmittingFeedback(false);
    }
  }

  return {
    activeGrounding:
      activeGroundingMessageId === null
        ? null
        : groundingByMessageId[activeGroundingMessageId] ?? null,
    activeGroundingMessageId,
    cancelVoiceInput,
    chatError,
    closeGrounding: () => setActiveGroundingMessageId(null),
    customerEmail,
    customerName,
    draft,
    feedbackError,
    groundingByMessageId,
    isAssistantSpeaking: voiceSession.voiceState === "assistant-speaking",
    isAwaitingReply:
      isAwaitingReply ||
      voiceSession.isAwaitingResponse ||
      voiceSession.voiceState === "connecting",
    isSubmittingFeedback,
    isSubmittingLead,
    isVoiceAvailable: voiceSession.isVoiceEnabled,
    isVoiceDefaultEnabled,
    isVoiceRecording: voiceSession.isRecording,
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
    setDraft: handleDraftChange,
    skipFeedback,
    skipLeadCapture,
    startExperience,
    startVoiceInput: handleVoicePrimaryAction,
    state,
    submitFeedback,
    submitLead,
    voiceError: voiceSession.voiceError,
    voiceState: voiceSession.voiceState,
  };
}
