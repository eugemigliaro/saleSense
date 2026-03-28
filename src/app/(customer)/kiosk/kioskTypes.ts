import type { ChatMessageGrounding } from "@/types/api";
import type { ChatMessage } from "@/types/domain";

export type KioskState = "idle" | "chat" | "lead" | "thanks";

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
  customerPhone?: string;
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
