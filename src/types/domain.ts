export type StoreManagerRole = "manager";
export type ChatMessageRole = "assistant" | "user";
export type ChatSessionStatus = "active" | "completed";
export type ConversationSaleOutcome =
  | "none"
  | "ai_inferred"
  | "store_confirmed";
export type ConversationFeedbackSentiment =
  | "positive"
  | "neutral"
  | "negative";

export type DeviceSessionState =
  | "idle"
  | "engaged"
  | "collecting-lead"
  | "completed";

export type DeviceSessionAttentionState = "healthy" | "attention-needed";

export interface StoreManager {
  email: string;
  id: string;
  name: string;
  role: StoreManagerRole;
  storeId: string;
}

export interface Product {
  brand: string;
  category: string;
  comparisonSnippetMarkdown: string;
  createdAt: string;
  detailsMarkdown: string;
  id: string;
  idleMediaUrl: string;
  name: string;
  sourceUrls: string[];
  storeId: string;
  updatedAt: string;
}

export interface DeviceSession {
  claimedAt: string | null;
  dismissedAt: string | null;
  id: string;
  lastActivityAt: string;
  lastPresenceAt: string | null;
  label: string | null;
  launchedByManagerId: string;
  productId: string;
  startedAt: string;
  state: DeviceSessionState;
  storeId: string;
}

export interface MonitoredDeviceSession extends DeviceSession {
  attentionState: DeviceSessionAttentionState;
}

export interface ChatSession {
  deviceSessionId: string;
  id: string;
  lastActivityAt: string;
  productId: string;
  startedAt: string;
  status: ChatSessionStatus;
  storeId: string;
}

export interface ChatMessage {
  content: string;
  createdAt: string;
  id: string;
  role: ChatMessageRole;
}

export interface ConversationAnalytics {
  buyProbability: number | null;
  chatSessionId: string;
  durationSeconds: number | null;
  endedAt: string | null;
  faqExamples: string[];
  faqTopics: string[];
  feedbackScore: number | null;
  feedbackSentiment: ConversationFeedbackSentiment | null;
  manualSaleConfirmed: boolean;
  messageCount: number;
  productId: string;
  redirectedToOtherProduct: boolean;
  redirectTargetProductId: string | null;
  saleOutcome: ConversationSaleOutcome;
  startedAt: string;
  storeId: string;
}

export interface Lead {
  aiSummary: string | null;
  chatSessionId: string | null;
  createdAt: string;
  customerEmail: string;
  customerName: string;
  customerPhone: string | null;
  id: string;
  inferredInterest: string | null;
  isSaleConfirmed: boolean;
  nextBestProduct: string | null;
  productId: string;
  storeId: string;
}
