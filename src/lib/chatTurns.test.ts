import { describe, expect, it, vi, beforeEach } from "vitest";

import { resolveSalesTurn } from "@/lib/chatTurns";
import type { SalesAssistantReplyResult } from "@/lib/ai/salesAgent";
import type { Product, ChatSession, ChatMessage } from "@/types/domain";

vi.mock("@/lib/ai/salesAgent", () => ({
  generateSalesAssistantReply: vi.fn(),
}));

vi.mock("@/lib/chat-sessions", () => ({
  appendChatMessage: vi.fn(),
  getChatSessionContextById: vi.fn(),
  listChatMessagesBySessionId: vi.fn(),
  touchChatSession: vi.fn(),
}));

vi.mock("@/lib/device-sessions", () => ({
  touchDeviceSession: vi.fn(),
}));

vi.mock("@/lib/leads", () => ({
  hasLeadForChatSession: vi.fn(),
}));

import { generateSalesAssistantReply } from "@/lib/ai/salesAgent";
import {
  appendChatMessage,
  getChatSessionContextById,
  listChatMessagesBySessionId,
  touchChatSession,
} from "@/lib/chat-sessions";
import { touchDeviceSession } from "@/lib/device-sessions";
import { hasLeadForChatSession } from "@/lib/leads";

const PRODUCT: Product = {
  brand: "Apple",
  category: "Phone",
  comparisonSnippetMarkdown: "Compact flagship option.",
  createdAt: "2026-03-29T09:00:00.000Z",
  detailsMarkdown: "Strong battery, bright display, and easy in-store tryout.",
  id: "11111111-1111-4111-8111-111111111111",
  idleMediaUrl: "https://example.com/idle.mp4",
  name: "iPhone Demo",
  sourceUrls: ["https://example.com/iphone"],
  storeId: "store-1",
  updatedAt: "2026-03-29T09:00:00.000Z",
};

const SESSION: ChatSession = {
  deviceSessionId: "22222222-2222-4222-8222-222222222222",
  id: "33333333-3333-4333-8333-333333333333",
  lastActivityAt: "2026-03-29T09:00:00.000Z",
  productId: PRODUCT.id,
  startedAt: "2026-03-29T09:00:00.000Z",
  status: "active",
  storeId: "store-1",
};

const USER_MESSAGE: ChatMessage = {
  content: "I want more battery life.",
  createdAt: "2026-03-29T09:01:00.000Z",
  id: "44444444-4444-4444-8444-444444444444",
  role: "user",
};

const ASSISTANT_MESSAGE: ChatMessage = {
  content: "This one keeps the conversation focused on battery life.",
  createdAt: "2026-03-29T09:01:05.000Z",
  id: "55555555-5555-4555-8555-555555555555",
  role: "assistant",
};

describe("resolveSalesTurn", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(getChatSessionContextById).mockResolvedValue({
      product: PRODUCT,
      session: SESSION,
    });
    vi.mocked(appendChatMessage)
      .mockResolvedValueOnce(USER_MESSAGE)
      .mockResolvedValueOnce(ASSISTANT_MESSAGE);
    vi.mocked(listChatMessagesBySessionId).mockResolvedValue([USER_MESSAGE]);
    vi.mocked(touchChatSession).mockResolvedValue(SESSION);
    vi.mocked(touchDeviceSession).mockResolvedValue(null);
    vi.mocked(generateSalesAssistantReply).mockResolvedValue({
      draft: {
        confidence: "high",
        language: "en",
        message: ASSISTANT_MESSAGE.content,
        objective: "pitch",
        recommendedAlternativeProductName: null,
        suggestedTryout: null,
      },
      grounding: null,
      leadCapture: null,
      notifyStoreStaff: false,
    } satisfies SalesAssistantReplyResult);
  });

  it("treats lead capture as already submitted when the chat session already has a lead", async () => {
    vi.mocked(hasLeadForChatSession).mockResolvedValue(true);

    await resolveSalesTurn(
      SESSION.id,
      "I want more battery life.",
      "idle",
    );

    expect(generateSalesAssistantReply).toHaveBeenCalledWith(
      expect.objectContaining({
        leadCaptureState: "submitted",
      }),
    );
  });
});
