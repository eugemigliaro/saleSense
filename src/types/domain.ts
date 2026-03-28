export type StoreManagerRole = "manager";
export type ChatMessageRole = "assistant" | "user";
export type ChatSessionStatus = "active" | "completed";

export type DeviceSessionState =
  | "idle"
  | "engaged"
  | "collecting-lead"
  | "completed";

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
  id: string;
  lastActivityAt: string;
  launchedByManagerId: string;
  productId: string;
  startedAt: string;
  state: DeviceSessionState;
  storeId: string;
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

export interface Lead {
  aiSummary: string | null;
  createdAt: string;
  customerEmail: string;
  customerName: string;
  customerPhone: string | null;
  id: string;
  inferredInterest: string | null;
  nextBestProduct: string | null;
  productId: string;
  storeId: string;
}
