import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  appendChatMessage,
  createChatSessionForDeviceSession,
} from "@/lib/chat-sessions";
import { buildChatGreeting } from "@/lib/mock-chat";

import { POST } from "./route";

vi.mock("@/lib/chat-sessions", () => ({
  appendChatMessage: vi.fn(),
  createChatSessionForDeviceSession: vi.fn(),
}));

vi.mock("@/lib/mock-chat", () => ({
  buildChatGreeting: vi.fn(),
}));

const mockCreateChatSessionForDeviceSession = vi.mocked(
  createChatSessionForDeviceSession,
);
const mockAppendChatMessage = vi.mocked(appendChatMessage);
const mockBuildChatGreeting = vi.mocked(buildChatGreeting);

describe("/api/v1/chat-sessions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 404 when the device session does not exist", async () => {
    mockCreateChatSessionForDeviceSession.mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost/api/v1/chat-sessions", {
        body: JSON.stringify({
          deviceSessionId: "11111111-1111-4111-8111-111111111111",
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      }),
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "not_found",
        message: "Device session not found.",
      },
    });
  });

  it("creates a chat session and returns the initial assistant message", async () => {
    mockCreateChatSessionForDeviceSession.mockResolvedValue({
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
    mockBuildChatGreeting.mockReturnValue({
      content: "Hi, I'm your guide.",
      createdAt: "2026-03-28T08:21:00.000Z",
      id: "44444444-4444-4444-8444-444444444444",
      role: "assistant",
    });
    mockAppendChatMessage.mockResolvedValue({
      content: "Hi, I'm your guide.",
      createdAt: "2026-03-28T08:21:00.000Z",
      id: "44444444-4444-4444-8444-444444444444",
      role: "assistant",
    });

    const response = await POST(
      new Request("http://localhost/api/v1/chat-sessions", {
        body: JSON.stringify({
          deviceSessionId: "22222222-2222-4222-8222-222222222222",
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      }),
    );

    expect(response.status).toBe(201);
    expect(response.headers.get("Location")).toBe(
      "/api/v1/chat-sessions/33333333-3333-4333-8333-333333333333",
    );
    await expect(response.json()).resolves.toEqual({
      data: {
        initialMessage: {
          content: "Hi, I'm your guide.",
          createdAt: "2026-03-28T08:21:00.000Z",
          id: "44444444-4444-4444-8444-444444444444",
          role: "assistant",
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
      },
    });
  });
});
