import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  appendChatMessage,
  createChatSessionForDeviceSession,
} from "@/lib/chat-sessions";
import { generateChatOpener } from "@/lib/ai/chatOpener";
import { requireKioskDeviceSessionAccess } from "@/lib/kiosk-auth";

import { POST } from "./route";

vi.mock("@/lib/ai/chatOpener", () => ({
  generateChatOpener: vi.fn(),
}));

vi.mock("@/lib/chat-sessions", () => ({
  appendChatMessage: vi.fn(),
  createChatSessionForDeviceSession: vi.fn(),
}));

vi.mock("@/lib/kiosk-auth", () => ({
  KioskAccessError: class KioskAccessError extends Error {},
  requireKioskDeviceSessionAccess: vi.fn(),
}));

const mockCreateChatSessionForDeviceSession = vi.mocked(
  createChatSessionForDeviceSession,
);
const mockAppendChatMessage = vi.mocked(appendChatMessage);
const mockGenerateChatOpener = vi.mocked(generateChatOpener);
const mockRequireKioskDeviceSessionAccess = vi.mocked(
  requireKioskDeviceSessionAccess,
);

describe("/api/v1/chat-sessions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireKioskDeviceSessionAccess.mockResolvedValue({
      claimed_at: "2026-03-28T08:20:00.000Z",
      dismissed_at: null,
      id: "11111111-1111-4111-8111-111111111111",
      kiosk_token_hash: "hash",
      label: "Front table",
      last_activity_at: "2026-03-28T08:20:00.000Z",
      last_presence_at: "2026-03-28T08:20:00.000Z",
      launched_by_manager_id: "seller-1",
      product_id: "11111111-1111-4111-8111-111111111111",
      started_at: "2026-03-28T08:20:00.000Z",
      state: "idle",
      store_id: "store-1",
    });
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
    mockGenerateChatOpener.mockResolvedValue(
      "Hi, what matters most to you right now?",
    );
    mockAppendChatMessage.mockResolvedValue({
      content: "Hi, what matters most to you right now?",
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
          content: "Hi, what matters most to you right now?",
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
