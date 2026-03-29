import type {
  ChatMessageGrounding,
  LeadCaptureInstruction,
  LeadCaptureState,
  ChatSessionLiveTokenPayload,
  ChatSessionLiveToolCallPayload,
} from "@/types/api";
import type { ChatMessage } from "@/types/domain";

export type KioskState = "idle" | "chat" | "feedback" | "thanks";
export type VoiceSessionState =
  | "idle"
  | "connecting"
  | "ready"
  | "recording"
  | "assistant-speaking"
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
  leadCapture: LeadCaptureInstruction | null;
}

export interface CreateLeadPayload {
  customerEmail: string;
  customerName?: string;
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
  leadCapture: LeadCaptureInstruction | null;
}

export type KioskLeadCaptureState = LeadCaptureState;
export type KioskLiveTokenResult = ChatSessionLiveTokenPayload;
export type KioskLiveToolCallResult = ChatSessionLiveToolCallPayload;
