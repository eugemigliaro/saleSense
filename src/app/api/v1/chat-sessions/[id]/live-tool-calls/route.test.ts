import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  ChatSessionInactiveError,
  ChatSessionNotFoundError,
  resolveSalesTurn,
} from "@/lib/chatTurns";
import { getChatSessionContextById } from "@/lib/chat-sessions";
import { requireKioskDeviceSessionAccess } from "@/lib/kiosk-auth";

import { POST } from "./route";

vi.mock("@/lib/chatTurns", () => ({
  ChatSessionInactiveError: class ChatSessionInactiveError extends Error {},
  ChatSessionNotFoundError: class ChatSessionNotFoundError extends Error {},
  resolveSalesTurn: vi.fn(),
}));

vi.mock("@/lib/chat-sessions", () => ({
  getChatSessionContextById: vi.fn(),
}));

vi.mock("@/lib/kiosk-auth", () => ({
  KioskAccessError: class KioskAccessError extends Error {},
  requireKioskDeviceSessionAccess: vi.fn(),
}));

const mockResolveSalesTurn = vi.mocked(resolveSalesTurn);
const mockGetChatSessionContextById = vi.mocked(getChatSessionContextById);
const mockRequireKioskDeviceSessionAccess = vi.mocked(
  requireKioskDeviceSessionAccess,
);

describe("/api/v1/chat-sessions/[id]/live-tool-calls", () => {
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
  });

  it("returns 404 when the chat session does not exist", async () => {
    mockResolveSalesTurn.mockRejectedValueOnce(
      new ChatSessionNotFoundError("Chat session not found."),
    );

    const response = await POST(
      new Request("http://localhost", {
        body: JSON.stringify({
          callId: "call-1",
          customerTranscript: "I mainly care about battery life.",
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

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "not_found",
        message: "Chat session not found.",
      },
    });
  });

  it("returns 409 when the chat session is inactive", async () => {
    mockResolveSalesTurn.mockRejectedValueOnce(
      new ChatSessionInactiveError("Chat session is no longer active."),
    );

    const response = await POST(
      new Request("http://localhost", {
        body: JSON.stringify({
          callId: "call-1",
          customerTranscript: "I mainly care about battery life.",
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

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "conflict",
        message: "Chat session is no longer active.",
      },
    });
  });

  it("returns the tool response payload and persisted chat messages", async () => {
    mockResolveSalesTurn.mockResolvedValueOnce({
      assistantMessage: {
        content: "This demo is strong on battery and day-to-day speed.",
        createdAt: "2026-03-28T08:22:00.000Z",
        id: "44444444-4444-4444-8444-444444444444",
        role: "assistant",
      },
      grounding: {
        searchEntryPointRenderedContent: null,
        sources: [
          {
            host: "www.apple.com",
            title: "Apple iPhone",
            url: "https://www.apple.com/iphone/",
          },
        ],
        tools: ["google-search"],
      },
      leadCapture: {
        benefit: "conversation-summary",
        language: "en",
        prompt:
          "I’m trying to get your email so I can send a short summary of this comparison to your inbox.",
        shouldPrompt: true,
      },
      notifyStoreStaff: false,
      session: {
        deviceSessionId: "22222222-2222-4222-8222-222222222222",
        id: "33333333-3333-4333-8333-333333333333",
        lastActivityAt: "2026-03-28T08:22:00.000Z",
        productId: "11111111-1111-4111-8111-111111111111",
        startedAt: "2026-03-28T08:21:00.000Z",
        status: "active",
        storeId: "store-1",
      },
      userMessage: {
        content: "I mainly care about battery life.",
        createdAt: "2026-03-28T08:21:30.000Z",
        id: "55555555-5555-4555-8555-555555555555",
        role: "user",
      },
    });

    const response = await POST(
      new Request("http://localhost", {
        body: JSON.stringify({
          callId: "call-1",
          customerTranscript: "I mainly care about battery life.",
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
    expect(mockResolveSalesTurn).toHaveBeenCalledWith(
      "33333333-3333-4333-8333-333333333333",
      "I mainly care about battery life.",
      "idle",
    );
    await expect(response.json()).resolves.toEqual({
      data: {
        assistantMessage: {
          content: "This demo is strong on battery and day-to-day speed.",
          createdAt: "2026-03-28T08:22:00.000Z",
          id: "44444444-4444-4444-8444-444444444444",
          role: "assistant",
        },
        functionResponse: {
          id: "call-1",
          name: "generate_sales_turn",
          response: {
            assistantMessage:
              "This demo is strong on battery and day-to-day speed.",
          },
        },
        grounding: {
          searchEntryPointRenderedContent: null,
          sources: [
            {
              host: "www.apple.com",
              title: "Apple iPhone",
              url: "https://www.apple.com/iphone/",
            },
          ],
          tools: ["google-search"],
        },
        leadCapture: {
          benefit: "conversation-summary",
          language: "en",
          prompt:
            "I’m trying to get your email so I can send a short summary of this comparison to your inbox.",
          shouldPrompt: true,
        },
        session: {
          deviceSessionId: "22222222-2222-4222-8222-222222222222",
          id: "33333333-3333-4333-8333-333333333333",
          lastActivityAt: "2026-03-28T08:22:00.000Z",
          productId: "11111111-1111-4111-8111-111111111111",
          startedAt: "2026-03-28T08:21:00.000Z",
          status: "active",
          storeId: "store-1",
        },
        userMessage: {
          content: "I mainly care about battery life.",
          createdAt: "2026-03-28T08:21:30.000Z",
          id: "55555555-5555-4555-8555-555555555555",
          role: "user",
        },
      },
    });
  });
});
