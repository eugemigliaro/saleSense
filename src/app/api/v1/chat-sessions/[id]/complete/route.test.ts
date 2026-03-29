import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  completeChatSession,
  getChatSessionContextById,
} from "@/lib/chat-sessions";
import { upsertCompletedConversationAnalytics } from "@/lib/conversationAnalytics";
import { requireKioskDeviceSessionAccess } from "@/lib/kiosk-auth";

import { POST } from "./route";

vi.mock("@/lib/chat-sessions", () => ({
  completeChatSession: vi.fn(),
  getChatSessionContextById: vi.fn(),
}));

vi.mock("@/lib/conversationAnalytics", () => ({
  upsertCompletedConversationAnalytics: vi.fn(),
}));

vi.mock("@/lib/kiosk-auth", () => ({
  KioskAccessError: class KioskAccessError extends Error {},
  requireKioskDeviceSessionAccess: vi.fn(),
}));

const mockCompleteChatSession = vi.mocked(completeChatSession);
const mockGetChatSessionContextById = vi.mocked(getChatSessionContextById);
const mockUpsertCompletedConversationAnalytics = vi.mocked(
  upsertCompletedConversationAnalytics,
);
const mockRequireKioskDeviceSessionAccess = vi.mocked(
  requireKioskDeviceSessionAccess,
);

describe("/api/v1/chat-sessions/[id]/complete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetChatSessionContextById.mockResolvedValue({
      product: {
        brand: "Apple",
        category: "Phone",
        comparisonSnippetMarkdown: "Compare against other phones.",
        createdAt: "2026-03-28T08:20:00.000Z",
        detailsMarkdown: "Detailed product markdown.",
        id: "11111111-1111-4111-8111-111111111111",
        idleMediaUrl: "https://example.com/idle.mp4",
        name: "iPhone Demo",
        sourceUrls: [],
        storeId: "store-1",
        updatedAt: "2026-03-28T08:20:00.000Z",
      },
      session: {
        deviceSessionId: "22222222-2222-4222-8222-222222222222",
        id: "33333333-3333-4333-8333-333333333333",
        lastActivityAt: "2026-03-28T08:21:00.000Z",
        productId: "11111111-1111-4111-8111-111111111111",
        startedAt: "2026-03-28T08:21:00.000Z",
        status: "active",
        storeId: "store-1",
      },
    });
    mockRequireKioskDeviceSessionAccess.mockResolvedValue({
      claimed_at: "2026-03-28T08:20:00.000Z",
      dismissed_at: null,
      id: "22222222-2222-4222-8222-222222222222",
      kiosk_token_hash: "hash",
      label: "Front table",
      last_activity_at: "2026-03-28T08:20:00.000Z",
      last_presence_at: "2026-03-28T08:20:00.000Z",
      launched_by_manager_id: "seller-1",
      product_id: "11111111-1111-4111-8111-111111111111",
      started_at: "2026-03-28T08:20:00.000Z",
      state: "engaged",
      store_id: "store-1",
    });
    mockUpsertCompletedConversationAnalytics.mockResolvedValue(undefined);
  });

  it("returns 404 when the chat session does not exist", async () => {
    mockCompleteChatSession.mockResolvedValueOnce(null);

    const response = await POST(
      new Request("http://localhost", {
        body: JSON.stringify({}),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      }),
      {
        params: Promise.resolve({
          id: "33333333-3333-4333-8333-333333333333",
        }),
      },
    );

    expect(response.status).toBe(404);
    expect(mockUpsertCompletedConversationAnalytics).toHaveBeenCalledWith({
      chatSessionId: "33333333-3333-4333-8333-333333333333",
      feedbackScore: null,
      productId: "11111111-1111-4111-8111-111111111111",
      startedAt: "2026-03-28T08:21:00.000Z",
      storeId: "store-1",
    });
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "not_found",
        message: "Chat session not found.",
      },
    });
  });

  it("returns the completed chat session with a persisted feedback score", async () => {
    mockCompleteChatSession.mockResolvedValueOnce({
      deviceSessionId: "22222222-2222-4222-8222-222222222222",
      id: "33333333-3333-4333-8333-333333333333",
      lastActivityAt: "2026-03-28T21:04:00.000Z",
      productId: "11111111-1111-4111-8111-111111111111",
      startedAt: "2026-03-28T21:00:00.000Z",
      status: "completed",
      storeId: "store-1",
    });

    const response = await POST(
      new Request("http://localhost", {
        body: JSON.stringify({
          feedbackScore: 5,
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      }),
      {
        params: Promise.resolve({
          id: "33333333-3333-4333-8333-333333333333",
        }),
      },
    );

    expect(response.status).toBe(200);
    expect(mockUpsertCompletedConversationAnalytics).toHaveBeenCalledWith({
      chatSessionId: "33333333-3333-4333-8333-333333333333",
      feedbackScore: 5,
      productId: "11111111-1111-4111-8111-111111111111",
      startedAt: "2026-03-28T08:21:00.000Z",
      storeId: "store-1",
    });
    expect(mockCompleteChatSession).toHaveBeenCalledWith(
      "33333333-3333-4333-8333-333333333333",
    );
    await expect(response.json()).resolves.toEqual({
      data: {
        session: {
          deviceSessionId: "22222222-2222-4222-8222-222222222222",
          id: "33333333-3333-4333-8333-333333333333",
          lastActivityAt: "2026-03-28T21:04:00.000Z",
          productId: "11111111-1111-4111-8111-111111111111",
          startedAt: "2026-03-28T21:00:00.000Z",
          status: "completed",
          storeId: "store-1",
        },
      },
    });
  });
});
