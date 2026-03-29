import { beforeEach, describe, expect, it, vi } from "vitest";

import { getSellerContext } from "@/lib/auth";
import { getChatSessionContextById } from "@/lib/chat-sessions";
import { getVerifiedKioskDeviceSessionRow } from "@/lib/kiosk-auth";
import {
  createLeadForProduct,
  listLeadsByStore,
} from "@/lib/leads";

import { GET, POST } from "./route";

vi.mock("@/lib/auth", () => ({
  getSellerContext: vi.fn(),
}));

vi.mock("@/lib/chat-sessions", () => ({
  getChatSessionContextById: vi.fn(),
}));

vi.mock("@/lib/kiosk-auth", () => ({
  getVerifiedKioskDeviceSessionRow: vi.fn(),
}));

vi.mock("@/lib/leads", () => ({
  createLeadForProduct: vi.fn(),
  listLeadsByStore: vi.fn(),
}));

const mockGetSellerContext = vi.mocked(getSellerContext);
const mockGetChatSessionContextById = vi.mocked(getChatSessionContextById);
const mockGetVerifiedKioskDeviceSessionRow = vi.mocked(
  getVerifiedKioskDeviceSessionRow,
);
const mockCreateLeadForProduct = vi.mocked(createLeadForProduct);
const mockListLeadsByStore = vi.mocked(listLeadsByStore);

describe("/api/v1/leads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetVerifiedKioskDeviceSessionRow.mockResolvedValue({
      claimed_at: "2026-03-28T08:20:00.000Z",
      dismissed_at: null,
      id: "device-1",
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

  it("returns 401 for seller lead listing without auth", async () => {
    mockGetSellerContext.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "unauthorized",
        message: "Seller authentication required.",
      },
    });
    expect(mockListLeadsByStore).not.toHaveBeenCalled();
  });

  it("returns 404 when the lead references a missing product", async () => {
    mockCreateLeadForProduct.mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost/api/v1/leads", {
        body: JSON.stringify({
          customerEmail: "prospect@example.com",
          customerName: "Prospect Buyer",
          productId: "11111111-1111-4111-8111-111111111111",
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
        message: "Product not found.",
      },
    });
  });

  it("normalizes and forwards optional chat session context for lead creation", async () => {
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
        deviceSessionId: "device-1",
        id: "22222222-2222-4222-8222-222222222222",
        lastActivityAt: "2026-03-28T08:21:00.000Z",
        productId: "11111111-1111-4111-8111-111111111111",
        startedAt: "2026-03-28T08:21:00.000Z",
        status: "active",
        storeId: "store-1",
      },
    });
    mockCreateLeadForProduct.mockResolvedValue({
      aiSummary: "Customer wants better battery life.",
      chatSessionId: "22222222-2222-4222-8222-222222222222",
      createdAt: "2026-03-28T08:30:00.000Z",
      customerEmail: "prospect@example.com",
      customerName: "Prospect Buyer",
      customerPhone: null,
      id: "44444444-4444-4444-8444-444444444444",
      inferredInterest: "battery life",
      isSaleConfirmed: false,
      nextBestProduct: null,
      productId: "11111111-1111-4111-8111-111111111111",
      storeId: "store-1",
    });

    const response = await POST(
      new Request("http://localhost/api/v1/leads", {
        body: JSON.stringify({
          chatSessionId: "22222222-2222-4222-8222-222222222222",
          customerEmail: "Prospect@Example.com",
          customerName: " Prospect Buyer ",
          productId: "11111111-1111-4111-8111-111111111111",
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      }),
    );

    expect(response.status).toBe(201);
    expect(mockCreateLeadForProduct).toHaveBeenCalledWith({
      aiSummary: null,
      chatSessionId: "22222222-2222-4222-8222-222222222222",
      customerEmail: "prospect@example.com",
      customerName: "Prospect Buyer",
      customerPhone: null,
      inferredInterest: null,
      nextBestProduct: null,
      productId: "11111111-1111-4111-8111-111111111111",
    });
  });
});
