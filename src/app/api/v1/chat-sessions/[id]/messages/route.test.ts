import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getChatSessionContextById,
  touchChatSession,
} from "@/lib/chat-sessions";
import { touchDeviceSession } from "@/lib/device-sessions";
import { buildMockAssistantReply } from "@/lib/mock-chat";

import { POST } from "./route";

vi.mock("@/lib/chat-sessions", () => ({
  getChatSessionContextById: vi.fn(),
  touchChatSession: vi.fn(),
}));

vi.mock("@/lib/device-sessions", () => ({
  touchDeviceSession: vi.fn(),
}));

vi.mock("@/lib/mock-chat", () => ({
  buildMockAssistantReply: vi.fn(),
}));

const mockGetChatSessionContextById = vi.mocked(getChatSessionContextById);
const mockTouchChatSession = vi.mocked(touchChatSession);
const mockTouchDeviceSession = vi.mocked(touchDeviceSession);
const mockBuildMockAssistantReply = vi.mocked(buildMockAssistantReply);

describe("/api/v1/chat-sessions/[id]/messages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 404 when the chat session does not exist", async () => {
    mockGetChatSessionContextById.mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost/api/v1/chat-sessions/333/messages", {
        body: JSON.stringify({
          content: "Tell me about the battery.",
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

  it("returns a mocked assistant reply and updates session activity", async () => {
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
    mockBuildMockAssistantReply.mockReturnValue({
      content: "The iPhone Demo is a strong fit.",
      createdAt: "2026-03-28T08:22:00.000Z",
      id: "44444444-4444-4444-8444-444444444444",
      role: "assistant",
    });
    mockTouchChatSession.mockResolvedValue({
      deviceSessionId: "22222222-2222-4222-8222-222222222222",
      id: "33333333-3333-4333-8333-333333333333",
      lastActivityAt: "2026-03-28T08:22:00.000Z",
      productId: "11111111-1111-4111-8111-111111111111",
      startedAt: "2026-03-28T08:21:00.000Z",
      status: "active",
      storeId: "store-1",
    });
    mockTouchDeviceSession.mockResolvedValue({
      id: "22222222-2222-4222-8222-222222222222",
      lastActivityAt: "2026-03-28T08:22:00.000Z",
      launchedByManagerId: "seller-1",
      productId: "11111111-1111-4111-8111-111111111111",
      startedAt: "2026-03-28T08:20:00.000Z",
      state: "engaged",
      storeId: "store-1",
    });

    const response = await POST(
      new Request("http://localhost/api/v1/chat-sessions/333/messages", {
        body: JSON.stringify({
          content: "Tell me about the battery.",
          history: [
            {
              content: "Hi there.",
              role: "assistant",
            },
          ],
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
    expect(mockTouchDeviceSession).toHaveBeenCalledWith(
      "22222222-2222-4222-8222-222222222222",
      "engaged",
    );
  });
});
