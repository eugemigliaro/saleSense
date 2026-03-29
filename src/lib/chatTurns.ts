import "server-only";

import { generateSalesAssistantReply } from "@/lib/ai/salesAgent";
import {
  appendChatMessage,
  getChatSessionContextById,
  listChatMessagesBySessionId,
  touchChatSession,
} from "@/lib/chat-sessions";
import { touchDeviceSession } from "@/lib/device-sessions";
import type { ChatMessageGrounding, LeadCaptureInstruction, LeadCaptureState } from "@/types/api";
import type { ChatMessage, ChatSession } from "@/types/domain";

export class ChatSessionNotFoundError extends Error {
  constructor(message = "Chat session not found.") {
    super(message);
    this.name = "ChatSessionNotFoundError";
  }
}

export class ChatSessionInactiveError extends Error {
  constructor(message = "Chat session is no longer active.") {
    super(message);
    this.name = "ChatSessionInactiveError";
  }
}

export interface ResolveSalesTurnResult {
  assistantMessage: ChatMessage;
  grounding: ChatMessageGrounding | null;
  leadCapture: LeadCaptureInstruction | null;
  notifyStoreStaff: boolean;
  session: ChatSession;
  userMessage: ChatMessage;
}

export async function resolveSalesTurn(
  chatSessionId: string,
  customerTranscript: string,
  leadCaptureState: LeadCaptureState = "idle",
): Promise<ResolveSalesTurnResult> {
  const normalizedTranscript = customerTranscript.trim();
  const chatSessionContext = await getChatSessionContextById(chatSessionId);

  if (!chatSessionContext) {
    throw new ChatSessionNotFoundError();
  }

  if (chatSessionContext.session.status !== "active") {
    throw new ChatSessionInactiveError();
  }

  const userMessage = await appendChatMessage(
    chatSessionId,
    "user",
    normalizedTranscript,
  );
  const history = await listChatMessagesBySessionId(chatSessionId);
  const assistantReply = await generateSalesAssistantReply({
    activeProduct: chatSessionContext.product,
    history,
    leadCaptureState,
    storeId: chatSessionContext.session.storeId,
  });
  const assistantMessage = await appendChatMessage(
    chatSessionId,
    "assistant",
    assistantReply.draft.message,
  );
  const [updatedSession] = await Promise.all([
    touchChatSession(chatSessionId),
    touchDeviceSession(
      chatSessionContext.session.deviceSessionId,
      assistantReply.notifyStoreStaff ? "collecting-lead" : "engaged",
    ),
  ]);

  if (!updatedSession) {
    throw new ChatSessionNotFoundError();
  }

  return {
    assistantMessage,
    grounding: assistantReply.grounding,
    leadCapture: assistantReply.leadCapture,
    notifyStoreStaff: assistantReply.notifyStoreStaff,
    session: updatedSession,
    userMessage,
  };
}
