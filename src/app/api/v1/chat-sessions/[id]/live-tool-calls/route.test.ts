import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  ChatSessionInactiveError,
  ChatSessionNotFoundError,
  resolveSalesTurn,
} from "@/lib/chatTurns";

import { POST } from "./route";

vi.mock("@/lib/chatTurns", () => ({
  ChatSessionInactiveError: class ChatSessionInactiveError extends Error {},
  ChatSessionNotFoundError: class ChatSessionNotFoundError extends Error {},
  resolveSalesTurn: vi.fn(),
}));

const mockResolveSalesTurn = vi.mocked(resolveSalesTurn);

describe("/api/v1/chat-sessions/[id]/live-tool-calls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
