import { beforeEach, describe, expect, it, vi } from "vitest";

import { createGeminiLiveToken } from "@/lib/ai/liveVoice";
import {
  getChatSessionContextById,
  getFirstChatMessageBySessionId,
} from "@/lib/chat-sessions";
import { requireKioskDeviceSessionAccess } from "@/lib/kiosk-auth";

import { POST } from "./route";

vi.mock("@/lib/ai/liveVoice", () => ({
  createGeminiLiveToken: vi.fn(),
}));

vi.mock("@/lib/chat-sessions", () => ({
  getChatSessionContextById: vi.fn(),
  getFirstChatMessageBySessionId: vi.fn(),
}));

vi.mock("@/lib/kiosk-auth", () => ({
  KioskAccessError: class KioskAccessError extends Error {},
  requireKioskDeviceSessionAccess: vi.fn(),
}));

const mockCreateGeminiLiveToken = vi.mocked(createGeminiLiveToken);
const mockGetChatSessionContextById = vi.mocked(getChatSessionContextById);
const mockGetFirstChatMessageBySessionId = vi.mocked(getFirstChatMessageBySessionId);
const mockRequireKioskDeviceSessionAccess = vi.mocked(
  requireKioskDeviceSessionAccess,
);

describe("/api/v1/chat-sessions/[id]/live-token", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    mockGetChatSessionContextById.mockResolvedValueOnce(null);

    const response = await POST(new Request("http://localhost"), {
      params: Promise.resolve({
        id: "33333333-3333-4333-8333-333333333333",
      }),
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "not_found",
        message: "Chat session not found.",
      },
    });
  });

  it("returns 409 when the chat session is inactive", async () => {
    mockGetChatSessionContextById.mockResolvedValueOnce({
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
        status: "completed",
        storeId: "store-1",
      },
    });

    const response = await POST(new Request("http://localhost"), {
      params: Promise.resolve({
        id: "33333333-3333-4333-8333-333333333333",
      }),
    });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "conflict",
        message: "Chat session is no longer active.",
      },
    });
  });

  it("returns a live token bootstrap payload for active sessions", async () => {
    mockGetChatSessionContextById.mockResolvedValueOnce({
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
    mockGetFirstChatMessageBySessionId.mockResolvedValueOnce({
      content: "Hi, what are you using today?",
      createdAt: "2026-03-28T08:21:00.000Z",
      id: "44444444-4444-4444-8444-444444444444",
      role: "assistant",
    });
    mockCreateGeminiLiveToken.mockResolvedValueOnce({
      expiresAt: "2026-03-28T09:00:00.000Z",
      liveConfig: {
        generationConfig: {
          maxOutputTokens: 1024,
        },
        inputAudioTranscription: {},
        outputAudioTranscription: {},
        responseModalities: ["AUDIO"],
        systemInstruction: "Voice transport",
        temperature: 0.2,
        thinkingConfig: {
          thinkingLevel: "MINIMAL",
        },
        tools: [
          {
            functionDeclarations: [
              {
                description: "Resolve one turn.",
                name: "generate_sales_turn",
                parameters: {
                  additionalProperties: false,
                  properties: {
                    customerTranscript: {
                      type: "STRING",
                    },
                  },
                  required: ["customerTranscript"],
                  type: "OBJECT",
                },
              },
            ],
          },
        ],
      },
      model: "gemini-3.1-flash-live-preview",
      opener: "Hi, what are you using today?",
      token: "ephemeral-token",
    });

    const response = await POST(new Request("http://localhost"), {
      params: Promise.resolve({
        id: "33333333-3333-4333-8333-333333333333",
      }),
    });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      data: {
        expiresAt: "2026-03-28T09:00:00.000Z",
        liveConfig: {
          generationConfig: {
            maxOutputTokens: 1024,
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          responseModalities: ["AUDIO"],
          systemInstruction: "Voice transport",
          temperature: 0.2,
          thinkingConfig: {
            thinkingLevel: "MINIMAL",
          },
          tools: [
            {
              functionDeclarations: [
                {
                  description: "Resolve one turn.",
                  name: "generate_sales_turn",
                  parameters: {
                    additionalProperties: false,
                    properties: {
                      customerTranscript: {
                        type: "STRING",
                      },
                    },
                    required: ["customerTranscript"],
                    type: "OBJECT",
                  },
                },
              ],
            },
          ],
        },
        model: "gemini-3.1-flash-live-preview",
        opener: "Hi, what are you using today?",
        token: "ephemeral-token",
      },
    });
  });
});
