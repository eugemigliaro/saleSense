import type {
  ChatMessageGrounding,
  ChatSessionLiveTokenPayload,
  ChatSessionLiveToolCallPayload,
} from "@/types/api";
import type { ChatMessage } from "@/types/domain";

export type KioskState = "idle" | "chat" | "lead" | "thanks";
export type VoiceSessionState =
  | "idle"
  | "connecting"
  | "assistant-speaking"
  | "customer-listening"
  | "fallback";

export interface KioskExperienceProps {
  brandName: string;
  category: string;
  comparisonSnippet: string;
  deviceSessionId: string | null;
  detailsMarkdown: string;
  idleMediaUrl: string | null;
  productId: string | null;
  productName: string;
  sourceLabel: string;
}

export interface ChatSessionCreatePayload {
  initialMessage: ChatMessage;
  session: {
    id: string;
  };
}

export interface ChatSessionMessagePayload {
  assistantMessage: ChatMessage;
  grounding: ChatMessageGrounding | null;
}

export interface CreateLeadPayload {
  customerEmail: string;
  customerName: string;
  chatSessionId?: string;
  productId: string;
}

export interface LiveChatSessionResult {
  initialMessage: ChatMessage | null;
  sessionId: string;
}

export interface LiveChatMessageResult {
  assistantMessage: ChatMessage;
  grounding: ChatMessageGrounding | null;
}

export type KioskLiveTokenResult = ChatSessionLiveTokenPayload;
export type KioskLiveToolCallResult = ChatSessionLiveToolCallPayload;
